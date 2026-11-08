use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    XChaCha20Poly1305,
};
use argon2::Argon2;
use rand::RngCore;
use generic_array::GenericArray;
use typenum::U24;
use zeroize::Zeroizing;

pub const SALT_LEN: usize = 16;
pub const NONCE_LEN: usize = 24;
pub const KEY_LEN: usize = 32;

pub const DEFAULT_ITERATIONS: u32 = 3;
pub const DEFAULT_MEMORY_COST: u32 = 65536;
pub const DEFAULT_PARALLELISM: u32 = 4;

/// Parameters stored in the archive header for key derivation.
///
/// The `nonce` field that existed in v0 of the format has been removed — it
/// was generated but never consumed.  Every chunk and the central index each
/// carry their own fresh, inline, per-item nonce.
///
/// On-disk layout (28 bytes):
///   salt          [16]
///   iterations    u32 LE
///   memory_cost   u32 LE
///   parallelism   u32 LE
#[derive(Debug, Clone)]
pub struct EncryptionParams {
    pub salt:         [u8; SALT_LEN],
    pub iterations:   u32,
    pub memory_cost:  u32,
    pub parallelism:  u32,
}

impl Default for EncryptionParams {
    fn default() -> Self {
        let mut salt = [0u8; SALT_LEN];
        OsRng.fill_bytes(&mut salt);
        EncryptionParams {
            salt,
            iterations:  DEFAULT_ITERATIONS,
            memory_cost: DEFAULT_MEMORY_COST,
            parallelism: DEFAULT_PARALLELISM,
        }
    }
}

impl EncryptionParams {
    /// Size of the serialised params block in bytes.
    pub const SIZE: usize = SALT_LEN + 4 + 4 + 4;

    pub fn write<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        writer.write_all(&self.salt)?;
        writer.write_all(&self.iterations.to_le_bytes())?;
        writer.write_all(&self.memory_cost.to_le_bytes())?;
        writer.write_all(&self.parallelism.to_le_bytes())?;
        Ok(())
    }

    pub fn read<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let mut salt  = [0u8; SALT_LEN];
        let mut buf4  = [0u8; 4];

        reader.read_exact(&mut salt)?;

        reader.read_exact(&mut buf4)?;
        let iterations = u32::from_le_bytes(buf4);

        reader.read_exact(&mut buf4)?;
        let memory_cost = u32::from_le_bytes(buf4);

        reader.read_exact(&mut buf4)?;
        let parallelism = u32::from_le_bytes(buf4);

        Ok(EncryptionParams { salt, iterations, memory_cost, parallelism })
    }
}

/// Derive a 32-byte encryption key from `password` using Argon2id.
///
/// Uses the raw `hash_password_into` API (direct KDF path) rather than the
/// PHC password-storage API, avoiding the unnecessary base64 round-trip and
/// PHC string allocation of the old `hash_password` call.
///
/// The returned key is wrapped in `Zeroizing` so it is zeroed on drop.
pub fn derive_key(
    password: &str,
    params: &EncryptionParams,
) -> Result<Zeroizing<[u8; KEY_LEN]>, EncryptionError> {
    let argon2_params = argon2::Params::new(
        params.memory_cost,
        params.iterations,
        params.parallelism,
        Some(KEY_LEN),
    )
    .map_err(|e| EncryptionError::KeyDerivation(e.to_string()))?;

    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        argon2_params,
    );

    let mut key = Zeroizing::new([0u8; KEY_LEN]);
    argon2
        .hash_password_into(password.as_bytes(), &params.salt, key.as_mut())
        .map_err(|e| EncryptionError::KeyDerivation(e.to_string()))?;

    Ok(key)
}

/// Generate a cryptographically random 24-byte nonce via the OS RNG.
///
/// Use this helper everywhere a nonce is needed so the RNG source is
/// consistently `OsRng` throughout security-critical paths.
pub fn random_nonce() -> [u8; NONCE_LEN] {
    let mut n = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut n);
    n
}

/// Encrypt `data` with XChaCha20-Poly1305.
///
/// Returns the raw ciphertext (+ 16-byte Poly1305 tag appended by the AEAD).
/// The caller is responsible for prepending the nonce before storing.
pub fn encrypt(
    data:        &[u8],
    key:         &[u8; KEY_LEN],
    nonce_bytes: &[u8; NONCE_LEN],
) -> Result<Vec<u8>, EncryptionError> {
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| EncryptionError::Cipher(e.to_string()))?;
    let nonce: &GenericArray<u8, U24> = GenericArray::from_slice(nonce_bytes);
    cipher
        .encrypt(nonce, data)
        .map_err(|e| EncryptionError::Cipher(e.to_string()))
}

/// Decrypt `encrypted_data` with XChaCha20-Poly1305.
///
/// Verifies the Poly1305 tag; returns `DecryptionFailed` on any mismatch so
/// that the error message does not leak oracle information.
pub fn decrypt(
    encrypted_data: &[u8],
    key:            &[u8; KEY_LEN],
    nonce_bytes:    &[u8; NONCE_LEN],
) -> Result<Vec<u8>, EncryptionError> {
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| EncryptionError::Cipher(e.to_string()))?;
    let nonce: &GenericArray<u8, U24> = GenericArray::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, encrypted_data)
        .map_err(|_| EncryptionError::DecryptionFailed)
}

#[derive(Debug, thiserror::Error)]
pub enum EncryptionError {
    #[error("Key derivation failed: {0}")]
    KeyDerivation(String),

    #[error("Cipher error: {0}")]
    Cipher(String),

    #[error("Decryption failed - wrong password or corrupted data")]
    DecryptionFailed,

    #[error("Invalid encrypted data: {0}")]
    InvalidData(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_deterministic() {
        let params = EncryptionParams {
            salt:        [0x42u8; SALT_LEN],
            iterations:  2,
            memory_cost: 8192,
            parallelism: 1,
        };
        let k1 = derive_key("hunter2", &params).unwrap();
        let k2 = derive_key("hunter2", &params).unwrap();
        assert_eq!(k1.as_ref(), k2.as_ref());
    }

    #[test]
    fn test_derive_key_different_password() {
        let params = EncryptionParams {
            salt:        [0x11u8; SALT_LEN],
            iterations:  2,
            memory_cost: 8192,
            parallelism: 1,
        };
        let k1 = derive_key("password1", &params).unwrap();
        let k2 = derive_key("password2", &params).unwrap();
        assert_ne!(k1.as_ref(), k2.as_ref());
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key   = [0xABu8; KEY_LEN];
        let nonce = [0xCDu8; NONCE_LEN];
        let data  = b"Hello, DodaZip encryption test!";

        let ct = encrypt(data, &key, &nonce).unwrap();
        let pt = decrypt(&ct, &key, &nonce).unwrap();
        assert_eq!(pt, data);
    }

    #[test]
    fn test_decrypt_wrong_key_fails() {
        let key1  = [0x01u8; KEY_LEN];
        let key2  = [0x02u8; KEY_LEN];
        let nonce = [0xFFu8; NONCE_LEN];
        let ct = encrypt(b"secret", &key1, &nonce).unwrap();
        assert!(decrypt(&ct, &key2, &nonce).is_err());
    }

    #[test]
    fn test_params_serialisation_roundtrip() {
        let p = EncryptionParams {
            salt:        [0x55u8; SALT_LEN],
            iterations:  4,
            memory_cost: 32768,
            parallelism: 2,
        };
        let mut buf = Vec::new();
        p.write(&mut buf).unwrap();
        assert_eq!(buf.len(), EncryptionParams::SIZE);

        let p2 = EncryptionParams::read(&mut buf.as_slice()).unwrap();
        assert_eq!(p2.salt,        p.salt);
        assert_eq!(p2.iterations,  p.iterations);
        assert_eq!(p2.memory_cost, p.memory_cost);
        assert_eq!(p2.parallelism, p.parallelism);
    }

    #[test]
    fn test_random_nonce_is_unique() {
        let n1 = random_nonce();
        let n2 = random_nonce();
        assert_ne!(n1, n2, "Two random nonces should not be equal");
    }
}
