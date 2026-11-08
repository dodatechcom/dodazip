pub mod chunk;
pub mod format;
pub mod archive;
pub mod crypto;
pub mod ecc;

#[cfg(feature = "fuse")]
pub mod fuse;

// FIX: replaced glob re-exports (`pub use module::*`) with explicit exports.
//
// The old code dumped every public symbol from every module into the crate
// root, making `dodazip::blake3_hash`, `dodazip::derive_key`, three separate
// `*Error` types, and ~50 other names all top-level.  Explicit exports give
// callers a clean, intentional public surface and prevent silent name
// collisions between modules.

// --- Format types ---
pub use format::{
    MAGIC_BYTES, CHUNK_MAGIC, INDEX_MAGIC, META_MAGIC, ECC_PARITY_MAGIC, CHUNK_TABLE_MAGIC,
    DEFAULT_CHUNK_SIZE, MAX_CHUNK_SIZE,
    FLAG_ENCRYPTED, FLAG_HAS_ECC, FLAG_HAS_CHUNK_TABLE,
    Codec, CompressionLevel,
    ArchiveHeader, ChunkTableEntry, ChunkHeader, FileEntry,
};

// --- Chunk helpers ---
pub use chunk::{compress, decompress, blake3_hash, Chunk, ChunkedReader, FastCDCIterator};

// --- Archive builder / reader ---
pub use archive::{ArchiveBuilder, ArchiveReader, ArchiveError};
pub use archive::{
    split_archive_into_volumes, secure_delete, is_portable_mode, get_config_dir,
};

// --- Cryptography ---
pub use crypto::{
    encrypt, decrypt, derive_key, random_nonce,
    EncryptionParams, EncryptionError,
    SALT_LEN, NONCE_LEN, KEY_LEN,
};

// --- Error-correcting codes ---
pub use ecc::{
    EccLevel, EccParams, EccError,
    create_ecc_shards, reconstruct_from_shards,
    extract_data_shards, extract_parity_shards,
    join_shards_for_reconstruction,
    DEFAULT_ECC_LEVELS,
};

// --- FUSE filesystem (feature-gated) ---
#[cfg(feature = "fuse")]
pub use fuse::mount_archive;

// WASM build: use `wasm-pack build --target web --features wasm`
// after adding wasm-bindgen and serde-wasm-bindgen to [dependencies]
// under `[target.'cfg(target_arch = "wasm32")'.dependencies]`.
