use std::io::{self, Read, Write};

pub const MAGIC_BYTES: &[u8; 8] = b"DODAZIP\x00";
pub const CHUNK_MAGIC: &[u8; 4] = b"CHNK";
pub const INDEX_MAGIC: &[u8; 4] = b"INDX";
pub const META_MAGIC: &[u8; 4] = b"META";
pub const ECC_PARITY_MAGIC: &[u8; 4] = b"ECCP";
pub const CHUNK_TABLE_MAGIC: &[u8; 4] = b"CTBL";

pub const DEFAULT_CHUNK_SIZE: usize = 256 * 1024;
pub const MAX_CHUNK_SIZE: usize = 8 * 1024 * 1024;
pub const FLAG_ENCRYPTED: u32 = 0x00000001;
pub const FLAG_HAS_ECC: u32 = 0x00000002;
pub const FLAG_HAS_CHUNK_TABLE: u32 = 0x00000004;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u16)]
pub enum Codec {
    Store = 0x0000,
    Zstd  = 0x0001,
    Lz4   = 0x0002,
    Lzma2 = 0x0003,
}

impl Codec {
    pub fn from_u16(v: u16) -> Option<Self> {
        match v {
            0x0000 => Some(Codec::Store),
            0x0001 => Some(Codec::Zstd),
            0x0002 => Some(Codec::Lz4),
            0x0003 => Some(Codec::Lzma2),
            _      => None,
        }
    }
}

impl Default for Codec {
    fn default() -> Self { Codec::Zstd }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompressionLevel {
    Fast     = 1,
    Balanced = 10,
    Maximum  = 22,
}

impl Default for CompressionLevel {
    fn default() -> Self { CompressionLevel::Balanced }
}

/// On-disk archive header.
///
/// `SIZE` is the byte count of the header fields **excluding** the 8-byte
/// `MAGIC_BYTES` prefix. The full on-disk block therefore occupies
/// `SIZE + 8 = 48` bytes.
#[derive(Debug, Clone, Default)]
pub struct ArchiveHeader {
    pub flags:              u32,
    pub chunk_count:        u32,
    pub index_offset:       u64,
    pub metadata_offset:    u64,
    pub chunk_table_offset: u64,
}

impl ArchiveHeader {
    /// Byte count of the header fields, **not** including the 8-byte magic prefix.
    /// Full on-disk size = SIZE + 8 = 48 bytes.
    pub const SIZE: usize = 4 + 4 + 8 + 8 + 8;

    pub fn write<W: Write>(&self, writer: &mut W) -> io::Result<()> {
        writer.write_all(MAGIC_BYTES)?;
        writer.write_all(&self.flags.to_le_bytes())?;
        writer.write_all(&self.chunk_count.to_le_bytes())?;
        writer.write_all(&self.index_offset.to_le_bytes())?;
        writer.write_all(&self.metadata_offset.to_le_bytes())?;
        writer.write_all(&self.chunk_table_offset.to_le_bytes())?;
        Ok(())
    }

    pub fn read<R: Read>(reader: &mut R) -> io::Result<Self> {
        let mut magic = [0u8; 8];
        reader.read_exact(&mut magic)?;
        if &magic != MAGIC_BYTES {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "Invalid archive magic"));
        }

        let mut buf4 = [0u8; 4];
        reader.read_exact(&mut buf4)?;
        let flags = u32::from_le_bytes(buf4);

        reader.read_exact(&mut buf4)?;
        let chunk_count = u32::from_le_bytes(buf4);

        let mut buf8 = [0u8; 8];
        reader.read_exact(&mut buf8)?;
        let index_offset = u64::from_le_bytes(buf8);

        reader.read_exact(&mut buf8)?;
        let metadata_offset = u64::from_le_bytes(buf8);

        reader.read_exact(&mut buf8)?;
        let chunk_table_offset = u64::from_le_bytes(buf8);

        Ok(ArchiveHeader { flags, chunk_count, index_offset, metadata_offset, chunk_table_offset })
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct ChunkTableEntry {
    pub chunk_offset:    u64,
    pub compressed_size: u32,
    pub original_size:   u32,
}

impl ChunkTableEntry {
    pub const SIZE: usize = 8 + 4 + 4;

    pub fn write<W: Write>(&self, writer: &mut W) -> io::Result<()> {
        writer.write_all(&self.chunk_offset.to_le_bytes())?;
        writer.write_all(&self.compressed_size.to_le_bytes())?;
        writer.write_all(&self.original_size.to_le_bytes())?;
        Ok(())
    }

    pub fn read<R: Read>(reader: &mut R) -> io::Result<Self> {
        let mut buf8 = [0u8; 8];
        reader.read_exact(&mut buf8)?;
        let chunk_offset = u64::from_le_bytes(buf8);

        let mut buf4 = [0u8; 4];
        reader.read_exact(&mut buf4)?;
        let compressed_size = u32::from_le_bytes(buf4);

        reader.read_exact(&mut buf4)?;
        let original_size = u32::from_le_bytes(buf4);

        Ok(ChunkTableEntry { chunk_offset, compressed_size, original_size })
    }
}

/// On-disk chunk header.
///
/// `SIZE` is the byte count of the struct fields **excluding** the 4-byte
/// `CHUNK_MAGIC` prefix. The full on-disk block therefore occupies
/// `SIZE + 4 = 48` bytes.
#[derive(Debug, Clone)]
pub struct ChunkHeader {
    pub compressed_size: u32,
    pub original_size:   u32,
    pub codec:           Codec,
    pub flags:           u16,
    pub blake3_hash:     [u8; 32],
}

impl ChunkHeader {
    /// Byte count of the chunk-header fields, **not** including the 4-byte magic prefix.
    /// Full on-disk size = SIZE + 4 = 48 bytes.
    pub const SIZE: usize = 4 + 4 + 2 + 2 + 32;

    pub fn write<W: Write>(&self, writer: &mut W) -> io::Result<()> {
        writer.write_all(CHUNK_MAGIC)?;
        writer.write_all(&self.compressed_size.to_le_bytes())?;
        writer.write_all(&self.original_size.to_le_bytes())?;
        writer.write_all(&(self.codec as u16).to_le_bytes())?;
        writer.write_all(&self.flags.to_le_bytes())?;
        writer.write_all(&self.blake3_hash)?;
        Ok(())
    }

    pub fn read<R: Read>(reader: &mut R) -> io::Result<Self> {
        let mut magic = [0u8; 4];
        reader.read_exact(&mut magic)?;
        if &magic != CHUNK_MAGIC {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "Invalid chunk magic"));
        }

        let mut buf4 = [0u8; 4];
        reader.read_exact(&mut buf4)?;
        let compressed_size = u32::from_le_bytes(buf4);

        reader.read_exact(&mut buf4)?;
        let original_size = u32::from_le_bytes(buf4);

        let mut buf2 = [0u8; 2];
        reader.read_exact(&mut buf2)?;
        let codec = Codec::from_u16(u16::from_le_bytes(buf2))
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "Unknown codec id"))?;

        reader.read_exact(&mut buf2)?;
        let flags = u16::from_le_bytes(buf2);

        let mut hash = [0u8; 32];
        reader.read_exact(&mut hash)?;

        Ok(ChunkHeader { compressed_size, original_size, codec, flags, blake3_hash: hash })
    }
}

#[derive(Debug, Clone)]
pub struct FileEntry {
    pub path:        String,
    pub file_size:   u64,
    pub chunk_refs:  Vec<(u32, u64)>,
    pub blake3_hash: [u8; 32],
    pub mtime:       u64,
    pub mode:        u32,
}
