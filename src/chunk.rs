use std::io::{self, Read};
use blake3::Hasher;

use crate::format::{Codec, CompressionLevel, ChunkHeader};

pub struct Chunk {
    pub header: ChunkHeader,
    pub data:   Vec<u8>,
}

// ---------------------------------------------------------------------------
// Compression / decompression
// ---------------------------------------------------------------------------

pub fn compress(data: &[u8], codec: Codec, level: CompressionLevel) -> io::Result<Vec<u8>> {
    match codec {
        Codec::Store => Ok(data.to_vec()),
        Codec::Zstd => {
            let lvl = match level {
                CompressionLevel::Fast     => 1,
                CompressionLevel::Balanced => 10,
                CompressionLevel::Maximum  => 22,
            };
            zstd::encode_all(data, lvl)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e))
        }
        Codec::Lz4 => Ok(lz4_flex::compress(data)),
        Codec::Lzma2 => {
            let lvl = match level {
                CompressionLevel::Fast     => 3,
                CompressionLevel::Balanced => 6,
                CompressionLevel::Maximum  => 9 | 0x8000_0000,
            };
            use std::io::Write;
            let mut enc = xz2::write::XzEncoder::new(Vec::new(), lvl);
            enc.write_all(data)?;
            enc.finish().map_err(|e| io::Error::new(io::ErrorKind::Other, e))
        }
    }
}

pub fn decompress(data: &[u8], original_size: usize, codec: Codec) -> io::Result<Vec<u8>> {
    match codec {
        Codec::Store => Ok(data.to_vec()),
        Codec::Zstd  => zstd::decode_all(data)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e)),
        Codec::Lz4   => lz4_flex::decompress(data, original_size)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e)),
        Codec::Lzma2 => {
            let mut dec = xz2::read::XzDecoder::new(data);
            let mut out = Vec::new();
            dec.read_to_end(&mut out)?;
            Ok(out)
        }
    }
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

pub fn blake3_hash(data: &[u8]) -> [u8; 32] {
    let mut h = Hasher::new();
    h.update(data);
    *h.finalize().as_bytes()
}

// ---------------------------------------------------------------------------
// FastCDC gear table — computed once at compile time, never re-allocated.
//
// FIX: was previously regenerated inside next_chunk() on every single call,
// allocating a fresh [u64; 256] per chunk (O(n) per byte of input).
// ---------------------------------------------------------------------------

const fn build_gear_table() -> [u64; 256] {
    let mut table = [0u64; 256];
    let mut seed  = 0x123456789ABCDEF0u64;
    let mut i = 0usize;
    while i < 256 {
        seed = seed.wrapping_mul(0x9E3779B97F4A7C15u64);
        seed ^= seed >> 32;
        table[i] = seed;
        i += 1;
    }
    table
}

const GEAR_TABLE: [u64; 256] = build_gear_table();

// ---------------------------------------------------------------------------
// Fixed-size chunker
// ---------------------------------------------------------------------------

pub struct ChunkedReader<R: Read> {
    inner:      R,
    chunk_size: usize,
    buffer:     Vec<u8>,
}

impl<R: Read> ChunkedReader<R> {
    pub fn new(inner: R, chunk_size: usize) -> Self {
        assert!(chunk_size > 0, "chunk_size must be > 0");
        ChunkedReader { inner, chunk_size, buffer: Vec::with_capacity(chunk_size) }
    }

    pub fn next_chunk(&mut self) -> io::Result<Option<Vec<u8>>> {
        self.buffer.clear();
        let mut tmp = vec![0u8; self.chunk_size];
        let mut total = 0usize;

        while total < self.chunk_size {
            match self.inner.read(&mut tmp[total..]) {
                Ok(0)                                           => break,
                Ok(n)                                           => total += n,
                Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
                Err(e)                                          => return Err(e),
            }
        }

        if total == 0 { Ok(None) } else { Ok(Some(tmp[..total].to_vec())) }
    }
}

/// Implement the standard `Iterator` trait so callers can use `for` loops and
/// the full `std::iter` adapter chain.
impl<R: Read> Iterator for ChunkedReader<R> {
    type Item = io::Result<Vec<u8>>;
    fn next(&mut self) -> Option<Self::Item> {
        self.next_chunk().transpose()
    }
}

// ---------------------------------------------------------------------------
// Content-defined chunker (FastCDC variant)
// ---------------------------------------------------------------------------

pub struct FastCDCIterator<R: Read> {
    inner:       R,
    /// Rolling-hash mask derived from target_size. Uses integer arithmetic to
    /// avoid the imprecision of `(target_size as f64).log2() as u64`.
    mask:        u64,
    target_size: usize,
    min_size:    usize,
    max_size:    usize,
    buffer:      Vec<u8>,
    eof:         bool,
}

impl<R: Read> FastCDCIterator<R> {
    pub fn new(inner: R, target_size: usize) -> Self {
        assert!(target_size > 0, "target_size must be > 0");
        // FIX: use integer bit-length instead of f64 log2 to avoid rounding
        // errors for non-power-of-two target sizes.
        let bits = usize::BITS - target_size.leading_zeros() - 1;
        let mask = (1u64 << bits) - 1;

        FastCDCIterator {
            inner,
            mask,
            target_size,
            min_size: target_size / 4,
            max_size: target_size * 4,
            buffer: Vec::with_capacity(target_size * 2),
            eof: false,
        }
    }

    /// Fill the internal buffer with up to `target_size * 2` bytes.
    ///
    /// FIX: the old version issued a single `read()` call which is allowed to
    /// return far fewer bytes than requested (short read).  We now loop until
    /// the buffer is full or EOF so that subsequent CDC boundary searches work
    /// on complete data.
    fn fill_buffer(&mut self) -> io::Result<usize> {
        let want   = self.target_size * 2;
        let mut tmp   = vec![0u8; want];
        let mut total = 0usize;

        while total < want {
            match self.inner.read(&mut tmp[total..]) {
                Ok(0)                                             => break,
                Ok(n)                                             => total += n,
                Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
                Err(e)                                            => return Err(e),
            }
        }

        if total > 0 {
            self.buffer.extend_from_slice(&tmp[..total]);
        }
        Ok(total)
    }

    pub fn next_chunk(&mut self) -> io::Result<Option<Vec<u8>>> {
        if self.eof && self.buffer.is_empty() {
            return Ok(None);
        }

        while self.buffer.len() < self.max_size && !self.eof {
            match self.fill_buffer() {
                Ok(0)  => self.eof = true,
                Ok(_)  => {}
                Err(e) => return Err(e),
            }
        }

        if self.buffer.is_empty() {
            return Ok(None);
        }

        // Emit the whole remaining buffer if it is smaller than min_size, or
        // if we have hit EOF and there is no more data coming.
        if self.buffer.len() <= self.min_size
            || (self.eof && self.buffer.len() < self.max_size)
        {
            return Ok(Some(std::mem::take(&mut self.buffer)));
        }

        let end          = self.buffer.len().min(self.max_size);
        let start_lookup = self.min_size;
        let mut hash     = 0u64;

        for i in start_lookup..end {
            hash = (hash << 1).wrapping_add(GEAR_TABLE[self.buffer[i] as usize]);
            if hash & self.mask == 0 {
                let chunk = self.buffer.drain(..i + 1).collect();
                return Ok(Some(chunk));
            }
        }

        Ok(Some(self.buffer.drain(..end).collect()))
    }
}

/// Implement the standard `Iterator` trait.
impl<R: Read> Iterator for FastCDCIterator<R> {
    type Item = io::Result<Vec<u8>>;
    fn next(&mut self) -> Option<Self::Item> {
        self.next_chunk().transpose()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_decompress_zstd() {
        let data = b"Hello, world! This is a test string for compression. Repeating to test ratio.".repeat(10);
        let compressed = compress(&data, Codec::Zstd, CompressionLevel::Balanced).unwrap();
        assert!(
            compressed.len() < data.len(),
            "compressed ({} bytes) should be smaller than original ({} bytes)",
            compressed.len(),
            data.len()
        );
        let decompressed = decompress(&compressed, data.len(), Codec::Zstd).unwrap();
        assert_eq!(&decompressed, &data);
    }

    #[test]
    fn test_compress_decompress_lz4() {
        let data = vec![b'A'; 4096];
        let c = compress(&data, Codec::Lz4, CompressionLevel::Fast).unwrap();
        let d = decompress(&c, data.len(), Codec::Lz4).unwrap();
        assert_eq!(d, data);
    }

    #[test]
    fn test_compress_decompress_lzma2() {
        let data = b"LZMA2 round-trip test data 1234567890";
        let c = compress(data, Codec::Lzma2, CompressionLevel::Balanced).unwrap();
        let d = decompress(&c, data.len(), Codec::Lzma2).unwrap();
        assert_eq!(&d, data);
    }

    #[test]
    fn test_compress_store_identity() {
        let data = b"unchanged";
        let c = compress(data, Codec::Store, CompressionLevel::Fast).unwrap();
        let d = decompress(&c, data.len(), Codec::Store).unwrap();
        assert_eq!(&d, data);
        assert_eq!(c.as_slice(), data.as_ref());
    }

    #[test]
    fn test_blake3_hash_length_and_determinism() {
        let data  = b"test data";
        let hash1 = blake3_hash(data);
        let hash2 = blake3_hash(data);
        assert_eq!(hash1.len(), 32);
        assert_eq!(hash1, hash2, "BLAKE3 must be deterministic");
    }

    #[test]
    fn test_blake3_different_inputs_differ() {
        assert_ne!(blake3_hash(b"foo"), blake3_hash(b"bar"));
    }

    #[test]
    fn test_chunked_reader_basic() {
        let data = vec![0u8; 1000];
        let mut reader = ChunkedReader::new(&data[..], 300);

        let c1 = reader.next_chunk().unwrap().unwrap();
        assert_eq!(c1.len(), 300);
        let c2 = reader.next_chunk().unwrap().unwrap();
        assert_eq!(c2.len(), 300);
        let c3 = reader.next_chunk().unwrap().unwrap();
        assert_eq!(c3.len(), 300);
        let c4 = reader.next_chunk().unwrap().unwrap();
        assert_eq!(c4.len(), 100);
        assert!(reader.next_chunk().unwrap().is_none());
    }

    #[test]
    fn test_chunked_reader_iterator() {
        let data   = vec![42u8; 500];
        let reader = ChunkedReader::new(&data[..], 200);
        let chunks: Vec<_> = reader.collect::<Result<_, _>>().unwrap();
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].len(), 200);
        assert_eq!(chunks[1].len(), 200);
        assert_eq!(chunks[2].len(), 100);
    }

    #[test]
    fn test_fastcdc_total_bytes_preserved() {
        let data: Vec<u8> = (0u8..=255).cycle().take(1_024 * 1024).collect();
        let mut chunker   = FastCDCIterator::new(&data[..], 256 * 1024);
        let mut total     = 0usize;

        while let Some(chunk) = chunker.next_chunk().unwrap() {
            let len = chunk.len();
            assert!(len > 0, "empty chunk");
            total += len;
        }
        assert_eq!(total, data.len(), "FastCDC must not drop or duplicate bytes");
    }

    #[test]
    fn test_fastcdc_iterator_trait() {
        let data = vec![0xABu8; 512 * 1024];
        let chunks: Vec<_> = FastCDCIterator::new(&data[..], 256 * 1024)
            .collect::<Result<_, _>>()
            .unwrap();
        let total: usize = chunks.iter().map(|c| c.len()).sum();
        assert_eq!(total, data.len());
    }

    #[test]
    fn test_gear_table_is_deterministic() {
        // Calling build_gear_table twice must produce the same output.
        let t1 = build_gear_table();
        let t2 = build_gear_table();
        assert_eq!(t1, t2);
        // Spot-check that entries are non-zero.
        assert!(t1.iter().any(|&v| v != 0));
    }
}
