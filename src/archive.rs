use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{self, Read, Write, Seek, SeekFrom, Cursor};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::sync::atomic::AtomicU32;

use rand::RngCore;
use rayon::prelude::*;

use crate::format::{
    ArchiveHeader, ChunkHeader, ChunkTableEntry, Codec, CompressionLevel, DEFAULT_CHUNK_SIZE,
    FileEntry, INDEX_MAGIC, META_MAGIC, ECC_PARITY_MAGIC, CHUNK_TABLE_MAGIC, 
    FLAG_ENCRYPTED, FLAG_HAS_ECC, FLAG_HAS_CHUNK_TABLE,
};
use crate::chunk::*;
use crate::crypto::{
    decrypt, encrypt, derive_key, EncryptionParams, EncryptionError, KEY_LEN, NONCE_LEN,
};
use crate::ecc::{EccLevel, create_ecc_shards, reconstruct_from_shards, EccParams, EccError};
use reed_solomon_novelpoly::wrapped_shard::WrappedShard;

#[derive(Debug, thiserror::Error)]
pub enum ArchiveError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
    #[error("Walkdir error: {0}")]
    Walkdir(#[from] walkdir::Error),
    #[error("Compression error: {0}")]
    Compression(String),
    #[error("Invalid archive format: {0}")]
    InvalidFormat(String),
    #[error("Hash mismatch for chunk")]
    HashMismatch,
    #[error("Encryption error: {0}")]
    Encryption(String),
    #[error("Archive is encrypted - password required")]
    PasswordRequired,
    #[error("Decryption failed - wrong password or corrupted data")]
    DecryptionFailed,
    #[error("ECC error: {0}")]
    Ecc(String),
}

impl From<EncryptionError> for ArchiveError {
    fn from(e: EncryptionError) -> Self {
        match e {
            EncryptionError::DecryptionFailed => ArchiveError::DecryptionFailed,
            other => ArchiveError::Encryption(other.to_string()),
        }
    }
}

impl From<EccError> for ArchiveError {
    fn from(e: EccError) -> Self {
        ArchiveError::Ecc(e.to_string())
    }
}

pub struct ArchiveBuilder {
    codec: Codec,
    level: CompressionLevel,
    chunk_size: usize,
    deduplicate: bool,
    password: Option<String>,
    ecc_level: Option<EccLevel>,
    chunk_hashes: Arc<Mutex<HashMap<[u8; 32], u32>>>,
    chunks: Arc<Mutex<Vec<EncryptedChunk>>>,
    next_chunk_idx: Arc<AtomicU32>,
    entries: Vec<FileEntry>,
}

pub struct EncryptedChunk {
    pub header: ChunkHeader,
    pub data: Vec<u8>,
    pub ecc_params: Option<EccParams>,
    pub parity_shards: Vec<Vec<u8>>,
}

impl Default for ArchiveBuilder {
    fn default() -> Self {
        ArchiveBuilder {
            codec: Codec::Zstd,
            level: CompressionLevel::Balanced,
            chunk_size: DEFAULT_CHUNK_SIZE,
            deduplicate: true,
            password: None,
            ecc_level: None,
            chunk_hashes: Arc::new(Mutex::new(HashMap::new())),
            chunks: Arc::new(Mutex::new(Vec::new())),
            next_chunk_idx: Arc::new(AtomicU32::new(0)),
            entries: Vec::new(),
        }
    }
}

impl ArchiveBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_codec(mut self, codec: Codec) -> Self {
        self.codec = codec;
        self
    }

    pub fn with_level(mut self, level: CompressionLevel) -> Self {
        self.level = level;
        self.chunk_size = match level {
            CompressionLevel::Fast     => 256 * 1024,
            CompressionLevel::Balanced => 1024 * 1024,
            CompressionLevel::Maximum  => 4 * 1024 * 1024,
        };
        self
    }

    pub fn with_chunk_size(mut self, size: usize) -> Self {
        self.chunk_size = size;
        self
    }

    pub fn with_deduplication(mut self, enabled: bool) -> Self {
        self.deduplicate = enabled;
        self
    }

    pub fn with_password(mut self, password: Option<String>) -> Self {
        self.password = password;
        self
    }

    pub fn with_ecc(mut self, level: Option<EccLevel>) -> Self {
        self.ecc_level = level;
        self
    }

    pub fn add_file<P: AsRef<Path>>(&mut self, path: P, archive_path: Option<&str>) -> Result<(), ArchiveError> {
        let path = path.as_ref();
        let metadata = fs::metadata(path)?;

        if !metadata.is_file() {
            return Err(ArchiveError::InvalidFormat(format!("Not a file: {:?}", path)));
        }

        let archive_path = archive_path
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| path.to_string_lossy().to_string())
            });

        let file_size = metadata.len();
        let mtime = metadata.modified()
            .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos() as u64)
            .unwrap_or(0);

        #[cfg(unix)]
        let mode = {
            use std::os::unix::fs::PermissionsExt;
            metadata.permissions().mode()
        };
        #[cfg(not(unix))]
        let mode = 0o644;

        let file = File::open(path)?;
        let (chunk_refs, file_hash) = self.process_file_stream(file)?;

        self.entries.push(FileEntry {
            path: archive_path,
            file_size,
            chunk_refs,
            blake3_hash: file_hash,
            mtime,
            mode,
        });

        Ok(())
    }

    pub fn add_directory<P: AsRef<Path>>(&mut self, dir: P, base_path: Option<&Path>) -> Result<(), ArchiveError> {
        let dir = dir.as_ref();
        let base = base_path.unwrap_or(dir);

        let files: Vec<_> = walkdir::WalkDir::new(dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
            .map(|e| {
                let rel_path = e.path().strip_prefix(base)
                    .unwrap_or(e.path())
                    .to_string_lossy()
                    .replace('\\', "/");
                (e.path().to_path_buf(), rel_path)
            })
            .collect();

        let errors = std::sync::Mutex::new(Vec::new());
        let entries_lock = std::sync::Mutex::new(Vec::new());

        let chunk_hashes = self.chunk_hashes.clone();
        let chunks = self.chunks.clone();
        let next_chunk_idx = self.next_chunk_idx.clone();
        let codec = self.codec;
        let level = self.level;
        let chunk_size = self.chunk_size;
        let deduplicate = self.deduplicate;
        let ecc_level = self.ecc_level;

        files.par_iter().for_each(|(path, rel_path)| {
            let metadata = match fs::metadata(path) {
                Ok(m) => m,
                Err(e) => {
                    errors.lock().unwrap().push(ArchiveError::Io(e));
                    return;
                }
            };

            let file_size = metadata.len();
            let mtime = metadata.modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos() as u64)
                .unwrap_or(0);

            #[cfg(unix)]
            let mode = {
                use std::os::unix::fs::PermissionsExt;
                metadata.permissions().mode()
            };
            #[cfg(not(unix))]
            let mode = 0o644;

            let file = match File::open(path) {
                Ok(f) => f,
                Err(e) => {
                    errors.lock().unwrap().push(ArchiveError::Io(e));
                    return;
                }
            };

            match Self::process_file_stream_par(file, chunk_size, codec, level, deduplicate, ecc_level, &chunk_hashes, &chunks, &next_chunk_idx) {
                Ok((chunk_refs, file_hash)) => {
                    let entry = FileEntry {
                        path: rel_path.clone(),
                        file_size,
                        chunk_refs,
                        blake3_hash: file_hash,
                        mtime,
                        mode,
                    };
                    entries_lock.lock().unwrap().push(entry);
                }
                Err(e) => {
                    errors.lock().unwrap().push(e);
                }
            }
        });

        let mut errors_guard = errors.lock().unwrap();
        if !errors_guard.is_empty() {
            return Err(errors_guard.remove(0));
        }
        drop(errors_guard);

        self.entries = std::mem::take(&mut *entries_lock.lock().unwrap());
        self.entries.sort_by(|a, b| a.path.cmp(&b.path));

        Ok(())
    }

    fn process_file_stream<R: Read>(&mut self, reader: R) -> Result<(Vec<(u32, u64)>, [u8; 32]), ArchiveError> {
        Self::process_file_stream_par(
            reader,
            self.chunk_size,
            self.codec,
            self.level,
            self.deduplicate,
            self.ecc_level,
            &self.chunk_hashes,
            &self.chunks,
            &self.next_chunk_idx,
        )
    }

    fn process_file_stream_par<R: Read>(
        mut reader: R,
        chunk_size: usize,
        codec: Codec,
        level: CompressionLevel,
        deduplicate: bool,
        ecc_level: Option<EccLevel>,
        chunk_hashes: &Arc<Mutex<HashMap<[u8; 32], u32>>>,
        chunks: &Arc<Mutex<Vec<EncryptedChunk>>>,
        _next_chunk_idx: &Arc<AtomicU32>,
    ) -> Result<(Vec<(u32, u64)>, [u8; 32]), ArchiveError> {
        let mut chunker = FastCDCIterator::new(&mut reader, chunk_size);
        let mut file_hasher = blake3::Hasher::new();
        let mut chunk_refs = Vec::new();
        let mut offset: u64 = 0;

        while let Some(chunk_data) = chunker.next_chunk()? {
            file_hasher.update(&chunk_data);
            let hash = blake3_hash(&chunk_data);

            // Fast path if deduplicating and already seen:
            let existing_idx = if deduplicate {
                chunk_hashes.lock().unwrap().get(&hash).copied()
            } else {
                None
            };

            let chunk_idx = if let Some(idx) = existing_idx {
                idx
            } else {
                // Compress outside the lock for multi-threaded performance
                let compressed = compress(&chunk_data, codec, level)
                    .map_err(|e| ArchiveError::Compression(e.to_string()))?;

                let (ecc_params_local, parity_shards) = if let Some(ecc_lvl) = ecc_level {
                    let params = EccParams::new(ecc_lvl, compressed.len() as u64);
                    let shards = create_ecc_shards(&compressed, ecc_lvl)?;
                    let parity: Vec<Vec<u8>> = shards.iter()
                        .skip(ecc_lvl.data_shards())
                        .map(|s| <WrappedShard as AsRef<[u8]>>::as_ref(s).to_vec())
                        .collect();
                    (Some(params), parity)
                } else {
                    (None, vec![])
                };

                let header = ChunkHeader {
                    compressed_size: compressed.len() as u32,
                    original_size: chunk_data.len() as u32,
                    codec,
                    flags: 0,
                    blake3_hash: hash,
                };

                // Atomically assign index and push into chunks so chunks[idx] is guaranteed
                let mut hashes = chunk_hashes.lock().unwrap();
                let mut chunks_guard = chunks.lock().unwrap();

                if deduplicate {
                    if let Some(&idx) = hashes.get(&hash) {
                        idx
                    } else {
                        let idx = chunks_guard.len() as u32;
                        hashes.insert(hash, idx);
                        chunks_guard.push(EncryptedChunk {
                            header,
                            data: compressed,
                            ecc_params: ecc_params_local,
                            parity_shards,
                        });
                        idx
                    }
                } else {
                    let idx = chunks_guard.len() as u32;
                    chunks_guard.push(EncryptedChunk {
                        header,
                        data: compressed,
                        ecc_params: ecc_params_local,
                        parity_shards,
                    });
                    idx
                }
            };

            chunk_refs.push((chunk_idx, offset));
            offset += chunk_data.len() as u64;
        }

        Ok((chunk_refs, *file_hasher.finalize().as_bytes()))
    }

    pub fn build<W: Write + Seek>(&mut self, writer: &mut W) -> Result<(), ArchiveError> {
        let is_encrypted = self.password.is_some();
        let has_ecc = self.ecc_level.is_some();
        
        let mut flags = 0u32;
        if is_encrypted { flags |= FLAG_ENCRYPTED; }
        if has_ecc { flags |= FLAG_HAS_ECC; }

        let mut chunks = std::mem::take(&mut *self.chunks.lock().unwrap());

        let header = ArchiveHeader {
            flags: flags,
            chunk_count: chunks.len() as u32,
            index_offset: 0,
            metadata_offset: 0,
            chunk_table_offset: 0,
        };

        header.write(writer)?;

        let enc_params = if let Some(ref password) = self.password {
            let params = EncryptionParams::default();
            params.write(writer)?;
            Some((params, password.clone()))
        } else {
            None
        };

        let mut chunk_table: Vec<ChunkTableEntry> = Vec::with_capacity(chunks.len());

        for chunk in &mut chunks {
            let chunk_offset = writer.stream_position()?;

            // Stream encrypt+write: encrypt each chunk and immediately write it
            if is_encrypted {
                let (ref params, ref password) = enc_params.as_ref().unwrap();
                let key = derive_key(password, params)?;

                let nonce = {
                    let mut n = [0u8; NONCE_LEN];
                    rand::thread_rng().fill_bytes(&mut n);
                    n
                };

                let encrypted = encrypt(&chunk.data, &key, &nonce)?;

                let mut full_data = Vec::with_capacity(NONCE_LEN + encrypted.len());
                full_data.extend_from_slice(&nonce);
                full_data.extend_from_slice(&encrypted);

                chunk.header.compressed_size = full_data.len() as u32;

                if let Some(ecc_lvl) = self.ecc_level {
                    let ecc_p = EccParams::new(ecc_lvl, full_data.len() as u64);
                    let shards = create_ecc_shards(&full_data, ecc_lvl)?;
                    let parity: Vec<Vec<u8>> = shards.iter()
                        .skip(ecc_lvl.data_shards())
                        .map(|s| <WrappedShard as AsRef<[u8]>>::as_ref(s).to_vec())
                        .collect();
                    chunk.ecc_params = Some(ecc_p);
                    chunk.parity_shards = parity;
                }

                chunk.data = full_data;
            } else if let Some(ecc_lvl) = self.ecc_level {
                let ecc_p = EccParams::new(ecc_lvl, chunk.data.len() as u64);
                let shards = create_ecc_shards(&chunk.data, ecc_lvl)?;
                let parity: Vec<Vec<u8>> = shards.iter()
                    .skip(ecc_lvl.data_shards())
                    .map(|s| <WrappedShard as AsRef<[u8]>>::as_ref(s).to_vec())
                    .collect();
                chunk.ecc_params = Some(ecc_p);
                chunk.parity_shards = parity;
            }

            // Write chunk header + data immediately
            chunk.header.write(writer)?;
            writer.write_all(&chunk.data)?;

            if let Some(ref ecc_params) = chunk.ecc_params {
                writer.write_all(ECC_PARITY_MAGIC)?;
                ecc_params.write(writer)?;
                writer.write_all(&(chunk.parity_shards.len() as u32).to_le_bytes())?;
                for parity in &chunk.parity_shards {
                    writer.write_all(&(parity.len() as u32).to_le_bytes())?;
                    writer.write_all(parity)?;
                }
            }

            chunk_table.push(ChunkTableEntry {
                chunk_offset,
                compressed_size: chunk.header.compressed_size,
                original_size: chunk.header.original_size,
            });

            // Free chunk data early for streaming memory efficiency
            chunk.data = Vec::new();
            chunk.parity_shards.clear();
        }

        let chunk_table_offset = writer.stream_position()?;
        flags |= FLAG_HAS_CHUNK_TABLE;

        writer.write_all(CHUNK_TABLE_MAGIC)?;
        writer.write_all(&(chunk_table.len() as u32).to_le_bytes())?;
        for entry in &chunk_table {
            entry.write(writer)?;
        }

        let index_offset = writer.stream_position()?;
        
        let mut index_bytes = Vec::new();
        Self::write_index_to_buffer(&self.entries, &mut index_bytes)?;
        
        if let Some((ref params, ref password)) = enc_params {
            let key = derive_key(password, params)?;
            let nonce = {
                let mut n = [0u8; NONCE_LEN];
                rand::thread_rng().fill_bytes(&mut n);
                n
            };
            
            let encrypted = encrypt(&index_bytes, &key, &nonce)?;
            
            let mut full_index = Vec::with_capacity(NONCE_LEN + encrypted.len());
            full_index.extend_from_slice(&nonce);
            full_index.extend_from_slice(&encrypted);
            
            writer.write_all(&full_index)?;
        } else {
            writer.write_all(&index_bytes)?;
        }

        let metadata_offset = writer.stream_position()?;
        self.write_metadata(writer)?;

        writer.seek(SeekFrom::Start(0))?;
        let final_header = ArchiveHeader {
            flags,
            chunk_count: chunks.len() as u32,
            index_offset,
            metadata_offset,
            chunk_table_offset,
        };
        final_header.write(writer)?;

        Ok(())
    }

    fn write_index_to_buffer(entries: &[FileEntry], buf: &mut Vec<u8>) -> io::Result<()> {
        buf.extend_from_slice(INDEX_MAGIC);
        buf.extend_from_slice(&(entries.len() as u32).to_le_bytes());

        for entry in entries {
            buf.extend_from_slice(&(entry.path.len() as u16).to_le_bytes());
            buf.extend_from_slice(entry.path.as_bytes());
            buf.extend_from_slice(&entry.file_size.to_le_bytes());
            buf.extend_from_slice(&(entry.chunk_refs.len() as u32).to_le_bytes());
            
            for &(chunk_idx, offset) in &entry.chunk_refs {
                buf.extend_from_slice(&chunk_idx.to_le_bytes());
                buf.extend_from_slice(&offset.to_le_bytes());
            }

            buf.extend_from_slice(&entry.blake3_hash);
            buf.extend_from_slice(&entry.mtime.to_le_bytes());
            buf.extend_from_slice(&entry.mode.to_le_bytes());
        }

        Ok(())
    }

    fn write_metadata<W: Write>(&self, writer: &mut W) -> io::Result<()> {
        writer.write_all(META_MAGIC)?;
        let created_by = format!("dodazip-{}", env!("CARGO_PKG_VERSION"));
        writer.write_all(&(created_by.len() as u16).to_le_bytes())?;
        writer.write_all(created_by.as_bytes())?;
        Ok(())
    }
}

pub struct ArchiveReader<R: Read + Seek> {
    inner: R,
    _header: ArchiveHeader,
    enc_params: Option<EncryptionParams>,
    key: Option<[u8; KEY_LEN]>,
    entries: Vec<FileEntry>,
    has_ecc: bool,
    chunk_table: Vec<ChunkTableEntry>,
}

impl<R: Read + Seek> ArchiveReader<R> {
    pub fn new(mut inner: R, password: Option<&str>) -> Result<Self, ArchiveError> {
        let header = ArchiveHeader::read(&mut inner)?;
        
        let is_encrypted = (header.flags & FLAG_ENCRYPTED) != 0;
        let has_ecc = (header.flags & FLAG_HAS_ECC) != 0;
        
        let (enc_params, key) = if is_encrypted {
            let params = EncryptionParams::read(&mut inner)?;
            
            if let Some(pw) = password {
                let k = derive_key(pw, &params)?;
                (Some(params), Some(*k))
            } else {
                return Err(ArchiveError::PasswordRequired);
            }
        } else {
            (None, None)
        };

        let chunk_table = Self::read_chunk_table(&mut inner, header.chunk_table_offset)?;

        inner.seek(SeekFrom::Start(header.index_offset))?;
        
        let entries = if let Some(k) = key {
            let mut nonce_bytes = [0u8; NONCE_LEN];
            inner.read_exact(&mut nonce_bytes)?;
            
            let index_end = header.metadata_offset;
            let current_pos = inner.stream_position()?;
            let encrypted_len = (index_end - current_pos) as usize;
            
            let mut encrypted_index = vec![0u8; encrypted_len];
            inner.read_exact(&mut encrypted_index)?;
            
            let decrypted = decrypt(&encrypted_index, &k, &nonce_bytes)?;
            
            Self::read_index_from_buffer(&decrypted)?
        } else {
            Self::read_index(&mut inner)?
        };

        Ok(ArchiveReader {
            inner,
            _header: header,
            enc_params,
            key,
            entries,
            has_ecc,
            chunk_table,
        })
    }

    fn read_chunk_table(reader: &mut R, table_offset: u64) -> Result<Vec<ChunkTableEntry>, ArchiveError> {
        if table_offset == 0 {
            return Ok(vec![]);
        }

        reader.seek(SeekFrom::Start(table_offset))?;
        
        let mut magic = [0u8; 4];
        reader.read_exact(&mut magic)?;
        if &magic != CHUNK_TABLE_MAGIC {
            return Ok(vec![]);
        }

        let mut buf4 = [0u8; 4];
        reader.read_exact(&mut buf4)?;
        let entry_count = u32::from_le_bytes(buf4) as usize;

        let mut chunk_table = Vec::with_capacity(entry_count);
        for _ in 0..entry_count {
            let entry = ChunkTableEntry::read(reader)?;
            chunk_table.push(entry);
        }

        Ok(chunk_table)
    }

    fn read_index_from_buffer(data: &[u8]) -> Result<Vec<FileEntry>, ArchiveError> {
        let mut cursor = Cursor::new(data);
        read_index_from_reader(&mut cursor)
    }

    fn read_index(reader: &mut R) -> Result<Vec<FileEntry>, ArchiveError> {
        read_index_from_reader(reader)
    }

    pub fn is_encrypted(&self) -> bool {
        self.enc_params.is_some()
    }

    pub fn entries(&self) -> &[FileEntry] {
        &self.entries
    }

    pub fn read_file_by_path<P: AsRef<Path>>(&mut self, path: P) -> Result<Vec<u8>, ArchiveError> {
        let path_str = path.as_ref().to_string_lossy();
        let entries_cloned: Vec<FileEntry> = self.entries.iter().cloned().collect();
        for entry in &entries_cloned {
            if entry.path == path_str {
                return self.read_entry_data(entry);
            }
        }
        Err(ArchiveError::InvalidFormat(format!("File not found: {:?}", path.as_ref())))
    }

    pub fn read_file_by_index(&mut self, index: usize) -> Result<Vec<u8>, ArchiveError> {
        if index >= self.entries.len() {
            return Err(ArchiveError::InvalidFormat("File index out of bounds".into()));
        }
        let entry = self.entries[index].clone();
        self.read_entry_data(&entry)
    }

    pub fn extract_all<P: AsRef<Path>>(&mut self, output_dir: P) -> Result<(), ArchiveError> {
        let output_dir = output_dir.as_ref();
        fs::create_dir_all(output_dir)?;

        let entries_cloned: Vec<FileEntry> = self.entries.iter().cloned().collect();

        for entry in entries_cloned {
            let clean_rel: PathBuf = Path::new(&entry.path)
                .components()
                .filter_map(|c| match c {
                    std::path::Component::Normal(s) => Some(s),
                    _ => None,
                })
                .collect();
            
            if clean_rel.as_os_str().is_empty() {
                continue; // Skip illegal traversal-only entries like ".." or "/"
            }

            let out_path = output_dir.join(&clean_rel);
            
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
            }

            let data = self.read_entry_data(&entry)?;
            
            let mut file = File::create(&out_path)?;
            file.write_all(&data)?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&out_path, fs::Permissions::from_mode(entry.mode));
            }

            let mtime = std::time::UNIX_EPOCH + std::time::Duration::from_nanos(entry.mtime);
            let _ = filetime::set_file_mtime(&out_path, filetime::FileTime::from_system_time(mtime));
        }

        Ok(())
    }

    fn read_entry_data(&mut self, entry: &FileEntry) -> Result<Vec<u8>, ArchiveError> {
        let mut result = Vec::with_capacity(entry.file_size as usize);

        let mut chunk_cache: HashMap<u32, Vec<u8>> = HashMap::new();

        for &(chunk_idx, _) in &entry.chunk_refs {
            if !chunk_cache.contains_key(&chunk_idx) {
                let chunk_data = self.read_and_decompress_chunk(chunk_idx)?;
                chunk_cache.insert(chunk_idx, chunk_data);
            }
        }

        for &(chunk_idx, _) in &entry.chunk_refs {
            if let Some(data) = chunk_cache.get(&chunk_idx) {
                result.extend_from_slice(data);
            }
        }

        let actual_hash = blake3_hash(&result);
        if actual_hash != entry.blake3_hash {
            return Err(ArchiveError::HashMismatch);
        }

        Ok(result)
    }

    fn read_and_decompress_chunk(&mut self, chunk_idx: u32) -> Result<Vec<u8>, ArchiveError> {
        let chunk_idx_usize = chunk_idx as usize;

        if chunk_idx_usize < self.chunk_table.len() && self.chunk_table[chunk_idx_usize].chunk_offset > 0 {
            self.inner.seek(SeekFrom::Start(self.chunk_table[chunk_idx_usize].chunk_offset))?;
        } else {
            let first_chunk_offset = if self.is_encrypted() {
                ArchiveHeader::SIZE as u64 + EncryptionParams::SIZE as u64
            } else {
                ArchiveHeader::SIZE as u64
            };

            self.inner.seek(SeekFrom::Start(first_chunk_offset))?;

            for _ in 0..chunk_idx {
                let header = ChunkHeader::read(&mut self.inner)?;
                self.inner.seek(SeekFrom::Current(header.compressed_size as i64))?;
                if self.has_ecc {
                    Self::skip_ecc_parity(&mut self.inner)?;
                }
            }
        }

        let header = ChunkHeader::read(&mut self.inner)?;
        
        let mut stored_data = vec![0u8; header.compressed_size as usize];
        self.inner.read_exact(&mut stored_data)?;

        let (ecc_params, parity_shards) = if self.has_ecc {
            Self::read_ecc_parity(&mut self.inner)?
        } else {
            (None, vec![])
        };

        if self.key.is_some() {
            if stored_data.len() < NONCE_LEN {
                return Err(ArchiveError::InvalidFormat("Encrypted chunk too short".into()));
            }
            let (nonce_bytes, ciphertext) = stored_data.split_at(NONCE_LEN);
            let mut nonce = [0u8; NONCE_LEN];
            nonce.copy_from_slice(nonce_bytes);
            
            let decrypted = decrypt(ciphertext, self.key.as_ref().unwrap(), &nonce);
            
            match decrypted {
                Ok(compressed) => {
                    let decompressed = decompress(
                        &compressed,
                        header.original_size as usize,
                        header.codec,
                    ).map_err(|e| ArchiveError::Compression(e.to_string()));
                    
                    match decompressed {
                        Ok(data) => {
                            let actual_hash = blake3_hash(&data);
                            if actual_hash == header.blake3_hash {
                                return Ok(data);
                            }
                            if ecc_params.is_none() || parity_shards.is_empty() {
                                return Err(ArchiveError::HashMismatch);
                            }
                        }
                        Err(_) => {
                            if ecc_params.is_none() || parity_shards.is_empty() {
                                return Err(ArchiveError::HashMismatch);
                            }
                        }
                    }
                }
                Err(_) => {
                    if ecc_params.is_none() || parity_shards.is_empty() {
                        return Err(ArchiveError::DecryptionFailed);
                    }
                }
            }
        } else {
            let decompressed = decompress(
                &stored_data,
                header.original_size as usize,
                header.codec,
            ).map_err(|e| ArchiveError::Compression(e.to_string()));
            
            match decompressed {
                Ok(data) => {
                    let actual_hash = blake3_hash(&data);
                    if actual_hash == header.blake3_hash {
                        return Ok(data);
                    }
                    if ecc_params.is_none() || parity_shards.is_empty() {
                        return Err(ArchiveError::HashMismatch);
                    }
                }
                Err(_) => {
                    if ecc_params.is_none() || parity_shards.is_empty() {
                        return Err(ArchiveError::HashMismatch);
                    }
                }
            }
        }

        if ecc_params.is_none() || parity_shards.is_empty() {
            return Err(ArchiveError::HashMismatch);
        }

        eprintln!("Chunk hash mismatch - attempting ECC recovery...");

        let ecc_p = ecc_params.unwrap();
        let level = ecc_p.level;
        let data_shards_count = level.data_shards();
        let parity_shards_count = level.parity_shards();
        let total_shards = level.total_shards();

        let all_shards_from_stored = create_ecc_shards(&stored_data, level)?;
        let regenerated_data_shards: Vec<Vec<u8>> = all_shards_from_stored.iter()
            .take(data_shards_count)
            .map(|s| <WrappedShard as AsRef<[u8]>>::as_ref(s).to_vec())
            .collect();

        let expected_size = header.compressed_size as usize;
        
        for erasure_count in 1..=parity_shards_count {
            if erasure_count > 1 && erasure_count > 2 {
                break;
            }
            
            let mut indices_to_erase: Vec<usize> = (0..erasure_count).collect();
            
            'outer: loop {
                let mut shards_for_recovery: Vec<Option<WrappedShard>> = Vec::with_capacity(total_shards);
                
                for i in 0..data_shards_count {
                    if indices_to_erase.contains(&i) {
                        shards_for_recovery.push(None);
                    } else {
                        shards_for_recovery.push(Some(WrappedShard::from(regenerated_data_shards[i].clone())));
                    }
                }
                
                for ps in &parity_shards {
                    shards_for_recovery.push(Some(WrappedShard::from(ps.clone())));
                }
                
                match reconstruct_from_shards(shards_for_recovery, level, expected_size) {
                    Ok(recovered) => {
                        let result = Self::try_decrypt_and_decompress(
                            &recovered,
                            self.key.as_ref(),
                            &header,
                        );
                        
                        if let Ok(data) = result {
                            let actual_hash = blake3_hash(&data);
                            if actual_hash == header.blake3_hash {
                                eprintln!("ECC recovery successful!");
                                return Ok(data);
                            }
                        }
                    }
                    Err(_) => {}
                }
                
                let mut i = erasure_count - 1;
                loop {
                    if indices_to_erase[i] < data_shards_count - (erasure_count - 1 - i) {
                        indices_to_erase[i] += 1;
                        for j in i + 1..erasure_count {
                            indices_to_erase[j] = indices_to_erase[j - 1] + 1;
                        }
                        break;
                    }
                    if i == 0 {
                        break 'outer;
                    }
                    i -= 1;
                }
            }
        }

        Err(ArchiveError::HashMismatch)
    }

    fn try_decrypt_and_decompress(
        data: &[u8],
        key: Option<&[u8; KEY_LEN]>,
        header: &ChunkHeader,
    ) -> Result<Vec<u8>, ArchiveError> {
        let to_decompress = if let Some(k) = key {
            if data.len() < NONCE_LEN {
                return Err(ArchiveError::InvalidFormat("Encrypted chunk too short".into()));
            }
            let (nonce_bytes, ciphertext) = data.split_at(NONCE_LEN);
            let mut nonce = [0u8; NONCE_LEN];
            nonce.copy_from_slice(nonce_bytes);
            decrypt(ciphertext, k, &nonce)?
        } else {
            data.to_vec()
        };

        decompress(
            &to_decompress,
            header.original_size as usize,
            header.codec,
        ).map_err(|e| ArchiveError::Compression(e.to_string()))
    }

    fn skip_ecc_parity<S: Read + Seek>(reader: &mut S) -> Result<(), ArchiveError> {
        let mut magic = [0u8; 4];
        reader.read_exact(&mut magic)?;
        if &magic != ECC_PARITY_MAGIC {
            return Err(ArchiveError::InvalidFormat("Expected ECC parity magic".into()));
        }
        
        let _ecc_params = EccParams::read(reader)?;
        
        let mut buf4 = [0u8; 4];
        reader.read_exact(&mut buf4)?;
        let num_parity = u32::from_le_bytes(buf4) as usize;
        
        for _ in 0..num_parity {
            reader.read_exact(&mut buf4)?;
            let shard_size = u32::from_le_bytes(buf4) as i64;
            reader.seek(SeekFrom::Current(shard_size))?;
        }
        
        Ok(())
    }

    fn read_ecc_parity<S: Read + Seek>(reader: &mut S) -> Result<(Option<EccParams>, Vec<Vec<u8>>), ArchiveError> {
        let mut magic = [0u8; 4];
        match reader.read_exact(&mut magic) {
            Ok(_) => {}
            Err(_) => return Ok((None, vec![])),
        }
        
        if &magic != ECC_PARITY_MAGIC {
            return Ok((None, vec![]));
        }
        
        let ecc_params = EccParams::read(reader)?;
        
        let mut buf4 = [0u8; 4];
        reader.read_exact(&mut buf4)?;
        let num_parity = u32::from_le_bytes(buf4) as usize;
        
        let mut parity_shards = Vec::with_capacity(num_parity);
        
        for _ in 0..num_parity {
            reader.read_exact(&mut buf4)?;
            let shard_size = u32::from_le_bytes(buf4) as usize;
            
            let mut shard = vec![0u8; shard_size];
            reader.read_exact(&mut shard)?;
            
            parity_shards.push(shard);
        }
        
        Ok((Some(ecc_params), parity_shards))
    }

    pub fn list_files(&self) {
        println!("{:<60} {:>12} {:>10}", "Path", "Size", "Chunks");
        println!("{}", "-".repeat(85));
        
        for entry in &self.entries {
            println!(
                "{:<60} {:>12} {:>10}",
                entry.path,
                entry.file_size,
                entry.chunk_refs.len()
            );
        }
    }
}

/// Split an existing archive into volume files (.001, .002, ...).
/// Each volume is at most `max_bytes` bytes. The first volume
/// retains the original filename; subsequent volumes get `.001`, `.002`, etc.
pub fn split_archive_into_volumes(archive_path: &Path, max_bytes: u64) -> Result<Vec<PathBuf>, ArchiveError> {
    if max_bytes < ArchiveHeader::SIZE as u64 + 1024 {
        return Err(ArchiveError::InvalidFormat(
            format!("Volume size {} too small (minimum ~1 KB)", max_bytes),
        ));
    }

    let mut source = File::open(archive_path)?;
    let source_len = source.metadata()?.len();

    let stem = archive_path.file_stem().unwrap_or_default().to_string_lossy();

    let mut volume_paths = Vec::new();
    let mut volume_index = 0u32;
    let mut offset = 0u64;

    while offset < source_len {
        let vol_path = if volume_index == 0 {
            archive_path.to_path_buf()
        } else {
            let name = format!("{}.{:03}", stem, volume_index);
            archive_path.with_file_name(name)
        };
        volume_paths.push(vol_path.clone());

        let remaining = source_len - offset;
        let vol_size = remaining.min(max_bytes);

        let mut out = File::create(&vol_path)?;
        let mut chunk = vec![0u8; 8192];
        let mut written = 0u64;
        while written < vol_size {
            let to_read = chunk.len().min((vol_size - written) as usize);
            let n = source.read(&mut chunk[..to_read])?;
            if n == 0 { break; }
            out.write_all(&chunk[..n])?;
            written += n as u64;
            offset += n as u64;
        }

        volume_index += 1;
    }

    Ok(volume_paths)
}

/// Securely delete a file by overwriting it before unlinking.
/// Performs 3 passes: zeros, ones, random.
pub fn secure_delete(path: &Path) -> Result<(), ArchiveError> {
    use rand::RngCore;

    let len = fs::metadata(path)?.len();
    if len == 0 {
        fs::remove_file(path)?;
        return Ok(());
    }

    // Pass 1: zeros
    overwrite_file(path, &vec![0u8; 4096])?;
    // Pass 2: ones
    overwrite_file(path, &vec![0xFFu8; 4096])?;
    // Pass 3: random
    let mut random_buf = vec![0u8; 4096];
    rand::thread_rng().fill_bytes(&mut random_buf);
    overwrite_file(path, &random_buf)?;

    // Rename to a random name before unlinking
    let mut rng = rand::thread_rng();
    let mut random_name: String = (0..12).map(|_| {
        const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyz0123456789";
        CHARS[(rng.next_u32() as usize) % CHARS.len()] as char
    }).collect();
    let mut random_path = path.parent().unwrap().join(&random_name);
    while random_path.exists() {
        random_name.push('_');
        random_path = path.parent().unwrap().join(&random_name);
    }
    fs::rename(path, &random_path).ok();
    fs::remove_file(&random_path).ok();

    Ok(())
}

fn overwrite_file(path: &Path, pattern: &[u8]) -> Result<(), ArchiveError> {
    let len = fs::metadata(path)?.len();
    let mut file = fs::File::create(path)?;
    let mut remaining = len;
    while remaining > 0 {
        let to_write = pattern.len().min(remaining as usize);
        file.write_all(&pattern[..to_write])?;
        remaining -= to_write as u64;
    }
    file.sync_all()?;
    Ok(())
}

/// Check if we're in portable mode (binary is on removable media).
pub fn is_portable_mode() -> bool {
    if let Ok(exe) = std::env::current_exe() {
        let path_str = exe.to_string_lossy().to_lowercase();
        // Check for common removable media paths
        if path_str.contains("/media/") || path_str.contains("/mnt/")
            || path_str.contains("/run/media/") || path_str.contains(":\\")
            || path_str.contains("/volumes/")
        {
            return true;
        }
    }
    false
}

/// Get config directory respecting portable mode.
pub fn get_config_dir() -> PathBuf {
    if is_portable_mode() {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                return parent.join("config");
            }
        }
    }
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("dodazip")
}

pub fn benchmark_compression(data: &[u8]) {
    use std::time::Instant;

    println!("=== Compression Benchmark ===");
    println!("Data size: {} bytes\n", data.len());

    let levels = [
        (CompressionLevel::Fast, "Fast"),
        (CompressionLevel::Balanced, "Balanced"),
        (CompressionLevel::Maximum, "Maximum"),
    ];

    for &(level, name) in &levels {
        let start = Instant::now();
        let compressed = compress(data, Codec::Zstd, level).unwrap();
        let compress_time = start.elapsed();

        let start = Instant::now();
        let _decompressed = decompress(&compressed, data.len(), Codec::Zstd).unwrap();
        let decompress_time = start.elapsed();

        let ratio = data.len() as f64 / compressed.len() as f64;
        let space_saving = 100.0 - (compressed.len() as f64 / data.len() as f64 * 100.0);

        println!("{} (Zstd):", name);
        println!("  Compressed: {} bytes", compressed.len());
        println!("  Ratio: {:.2}x", ratio);
        println!("  Space saving: {:.1}%", space_saving);
        println!("  Compress time: {:?}", compress_time);
        println!("  Decompress time: {:?}", decompress_time);
        println!();
    }
}

fn read_index_from_reader<R: Read>(reader: &mut R) -> Result<Vec<FileEntry>, ArchiveError> {
    let mut magic = [0u8; 4];
    reader.read_exact(&mut magic)?;
    if &magic != INDEX_MAGIC {
        return Err(ArchiveError::InvalidFormat("Invalid index magic".into()));
    }

    let mut buf = [0u8; 4];
    reader.read_exact(&mut buf)?;
    let entry_count = u32::from_le_bytes(buf) as usize;

    let mut entries = Vec::with_capacity(entry_count);

    for _ in 0..entry_count {
        let mut buf2 = [0u8; 2];
        reader.read_exact(&mut buf2)?;
        let path_len = u16::from_le_bytes(buf2) as usize;

        let mut path_bytes = vec![0u8; path_len];
        reader.read_exact(&mut path_bytes)?;
        let path = String::from_utf8_lossy(&path_bytes).to_string();

        let mut buf8 = [0u8; 8];
        reader.read_exact(&mut buf8)?;
        let file_size = u64::from_le_bytes(buf8);

        let mut buf4 = [0u8; 4];
        reader.read_exact(&mut buf4)?;
        let chunk_refs_count = u32::from_le_bytes(buf4) as usize;

        let mut chunk_refs = Vec::with_capacity(chunk_refs_count);
        for _ in 0..chunk_refs_count {
            reader.read_exact(&mut buf4)?;
            let chunk_idx = u32::from_le_bytes(buf4);

            reader.read_exact(&mut buf8)?;
            let offset = u64::from_le_bytes(buf8);

            chunk_refs.push((chunk_idx, offset));
        }

        let mut hash = [0u8; 32];
        reader.read_exact(&mut hash)?;

        reader.read_exact(&mut buf8)?;
        let mtime = u64::from_le_bytes(buf8);

        reader.read_exact(&mut buf4)?;
        let mode = u32::from_le_bytes(buf4);

        entries.push(FileEntry {
            path,
            file_size,
            chunk_refs,
            blake3_hash: hash,
            mtime,
            mode,
        });
    }

    Ok(entries)
}
