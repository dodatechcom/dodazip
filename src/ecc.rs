use reed_solomon_novelpoly::CodeParams;
use reed_solomon_novelpoly::wrapped_shard::WrappedShard;

pub const DEFAULT_ECC_LEVELS: [EccLevel; 3] = [EccLevel::Low, EccLevel::Medium, EccLevel::High];

#[derive(Debug, Clone, Copy, PartialEq, Eq, clap::ValueEnum)]
pub enum EccLevel {
    Low,
    Medium,
    High,
}

impl EccLevel {
    pub fn data_shards(self) -> usize {
        8
    }

    pub fn parity_shards(self) -> usize {
        match self {
            EccLevel::Low    => 2,
            EccLevel::Medium => 4,
            EccLevel::High   => 8,
        }
    }

    pub fn total_shards(self) -> usize {
        self.data_shards() + self.parity_shards()
    }

    pub fn overhead_percent(self) -> f64 {
        (self.parity_shards() as f64 / self.data_shards() as f64) * 100.0
    }

    /// Maximum number of lost shards that can be recovered.
    pub fn max_repairable_shards(self) -> usize {
        self.parity_shards()
    }
}

impl Default for EccLevel {
    fn default() -> Self { EccLevel::Low }
}

pub struct EccParams {
    pub level:              EccLevel,
    pub data_shards:        usize,
    pub parity_shards:      usize,
    pub original_data_size: u64,
}

impl Default for EccParams {
    fn default() -> Self { Self::new(EccLevel::Low, 0) }
}

impl EccParams {
    pub fn new(level: EccLevel, original_data_size: u64) -> Self {
        EccParams {
            level,
            data_shards:        level.data_shards(),
            parity_shards:      level.parity_shards(),
            original_data_size,
        }
    }

    pub const fn size() -> usize {
        4 + 4 + 4 + 8
    }

    pub fn write<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        let level_code: u32 = match self.level {
            EccLevel::Low    => 0,
            EccLevel::Medium => 1,
            EccLevel::High   => 2,
        };
        writer.write_all(&level_code.to_le_bytes())?;
        writer.write_all(&(self.data_shards as u32).to_le_bytes())?;
        writer.write_all(&(self.parity_shards as u32).to_le_bytes())?;
        writer.write_all(&self.original_data_size.to_le_bytes())?;
        Ok(())
    }

    pub fn read<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let mut buf4 = [0u8; 4];
        reader.read_exact(&mut buf4)?;
        let level_code = u32::from_le_bytes(buf4);

        // FIX: the old code silently defaulted an unknown level code to Low,
        // hiding format corruption. Return an error instead.
        let level = match level_code {
            0 => EccLevel::Low,
            1 => EccLevel::Medium,
            2 => EccLevel::High,
            _ => return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Unknown ECC level code: {}", level_code),
            )),
        };

        reader.read_exact(&mut buf4)?;
        let data_shards = u32::from_le_bytes(buf4) as usize;

        reader.read_exact(&mut buf4)?;
        let parity_shards = u32::from_le_bytes(buf4) as usize;

        let mut buf8 = [0u8; 8];
        reader.read_exact(&mut buf8)?;
        let original_data_size = u64::from_le_bytes(buf8);

        Ok(EccParams { level, data_shards, parity_shards, original_data_size })
    }
}

pub fn create_ecc_shards(data: &[u8], level: EccLevel) -> Result<Vec<WrappedShard>, EccError> {
    if data.is_empty() {
        return Ok(vec![]);
    }

    let k = level.data_shards();
    let n = level.total_shards();

    let params  = CodeParams::derive_parameters(n, k)?;
    let encoder = params.make_encoder();
    let shards  = encoder.encode::<WrappedShard>(data)?;

    Ok(shards)
}

pub fn reconstruct_from_shards(
    mut shards:         Vec<Option<WrappedShard>>,
    level:              EccLevel,
    original_data_size: usize,
) -> Result<Vec<u8>, EccError> {
    let k = level.data_shards();
    let n = level.total_shards();

    // Pad with None (erasure markers) if caller passed fewer than n shards.
    while shards.len() < n {
        shards.push(None);
    }

    let params    = CodeParams::derive_parameters(n, k)?;
    let encoder   = params.make_encoder();
    let recovered = encoder.reconstruct(shards)?;

    if recovered.len() >= original_data_size {
        Ok(recovered[..original_data_size].to_vec())
    } else {
        Ok(recovered)
    }
}

pub fn extract_data_shards(shards: &[WrappedShard], data_shard_count: usize) -> Vec<Vec<u8>> {
    shards
        .iter()
        .take(data_shard_count)
        .map(|s| <WrappedShard as AsRef<[u8]>>::as_ref(s).to_vec())
        .collect()
}

pub fn extract_parity_shards(shards: &[WrappedShard], data_shard_count: usize) -> Vec<Vec<u8>> {
    shards
        .iter()
        .skip(data_shard_count)
        .map(|s| <WrappedShard as AsRef<[u8]>>::as_ref(s).to_vec())
        .collect()
}

pub fn join_shards_for_reconstruction(
    data_shards:    &[Vec<u8>],
    parity_shards:  &[Vec<u8>],
    erased_indices: &[usize],
) -> Vec<Option<WrappedShard>> {
    let total = data_shards.len() + parity_shards.len();
    let mut result = Vec::with_capacity(total);

    for (idx, shard) in data_shards.iter().enumerate() {
        if erased_indices.contains(&idx) {
            result.push(None);
        } else {
            result.push(Some(WrappedShard::from(shard.clone())));
        }
    }

    let data_count = data_shards.len();
    for (idx, shard) in parity_shards.iter().enumerate() {
        let global_idx = data_count + idx;
        if erased_indices.contains(&global_idx) {
            result.push(None);
        } else {
            result.push(Some(WrappedShard::from(shard.clone())));
        }
    }

    result
}

#[derive(Debug, thiserror::Error)]
pub enum EccError {
    #[error("Reed-Solomon error: {0}")]
    ReedSolomon(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid parameters: {0}")]
    InvalidParams(String),
}

impl From<reed_solomon_novelpoly::Error> for EccError {
    fn from(e: reed_solomon_novelpoly::Error) -> Self {
        EccError::ReedSolomon(e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ecc_roundtrip_all_present() {
        let data  = b"Hello, this is test data for Reed-Solomon error correction!";
        let level = EccLevel::Low;
        let shards = create_ecc_shards(data, level).unwrap();
        assert_eq!(shards.len(), level.total_shards());

        let all: Vec<Option<WrappedShard>> = shards.into_iter().map(Some).collect();
        let recovered = reconstruct_from_shards(all, level, data.len()).unwrap();
        assert_eq!(recovered, data);
    }

    #[test]
    fn test_ecc_erasure_recovery_medium() {
        let data  = b"Test data that needs erasure recovery 1234567890!@#$%^&*()";
        let level = EccLevel::Medium;
        let shards = create_ecc_shards(data, level).unwrap();

        let mut with_gaps: Vec<Option<WrappedShard>> = shards.into_iter().map(Some).collect();
        with_gaps[2] = None;
        with_gaps[5] = None;

        let recovered = reconstruct_from_shards(with_gaps, level, data.len()).unwrap();
        assert_eq!(recovered, data);
    }

    #[test]
    fn test_ecc_params_serialisation() {
        let p = EccParams::new(EccLevel::High, 123456);
        let mut buf = Vec::new();
        p.write(&mut buf).unwrap();
        assert_eq!(buf.len(), EccParams::size());

        let p2 = EccParams::read(&mut buf.as_slice()).unwrap();
        assert!(matches!(p2.level, EccLevel::High));
        assert_eq!(p2.data_shards,        p.data_shards);
        assert_eq!(p2.parity_shards,      p.parity_shards);
        assert_eq!(p2.original_data_size, 123456);
    }

    #[test]
    fn test_ecc_unknown_level_code_is_error() {
        // FIX: previously silently defaulted to Low; now it must be an error.
        let bad_bytes: &[u8] = &[
            0xFF, 0xFF, 0xFF, 0xFF,   // unknown level code = 0xFFFFFFFF
            8, 0, 0, 0,               // data_shards
            2, 0, 0, 0,               // parity_shards
            0, 0, 0, 0, 0, 0, 0, 0,  // original_data_size
        ];
        assert!(EccParams::read(&mut &bad_bytes[..]).is_err());
    }

    #[test]
    fn test_overhead_percent() {
        assert!((EccLevel::Low.overhead_percent()    - 25.0).abs() < 0.001);
        assert!((EccLevel::Medium.overhead_percent() - 50.0).abs() < 0.001);
        assert!((EccLevel::High.overhead_percent()   - 100.0).abs() < 0.001);
    }
}
