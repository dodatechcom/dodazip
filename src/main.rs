use std::path::{Path, PathBuf};
use std::fs::File;

use clap::{Parser, Subcommand};
use anyhow::{Context, Result};

use dodazip::*;
use dodazip::format::{Codec, CompressionLevel};
use std::io::Read;

#[derive(Parser)]
#[command(name = "dodazip")]
#[command(about = "Cross-platform compression tool with better ratio than 7-Zip")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Compress {
        #[arg(short, long)]
        output: PathBuf,

        #[arg(short, long, value_enum, default_value = "balanced")]
        level: LevelArg,

        #[arg(short, long, default_value = "zstd")]
        codec: CodecArg,

        #[arg(long, default_value = "true")]
        dedup: bool,

        /// Password for encryption.
        ///
        /// WARNING: passing a password on the command line exposes it in the
        /// process list (`ps aux`).  Prefer --password-stdin to read the
        /// password from standard input with no echo, or set the
        /// DODAZIP_PASSWORD environment variable.
        #[arg(long, conflicts_with = "password_stdin")]
        password: Option<String>,

        /// Read the encryption password from stdin (no echo).
        /// Mutually exclusive with --password.
        #[arg(long, default_value = "false")]
        password_stdin: bool,

        #[arg(long, value_enum)]
        ecc: Option<EccLevelArg>,

        inputs: Vec<PathBuf>,
    },

    Extract {
        #[arg(short, long, default_value = ".")]
        output: PathBuf,

        #[arg(long, conflicts_with = "password_stdin")]
        password: Option<String>,

        #[arg(long, default_value = "false")]
        password_stdin: bool,

        archive: PathBuf,
    },

    List {
        #[arg(long, conflicts_with = "password_stdin")]
        password: Option<String>,

        #[arg(long, default_value = "false")]
        password_stdin: bool,

        archive: PathBuf,
    },

    Bench {
        file: Option<PathBuf>,
    },

    #[cfg(feature = "fuse")]
    Mount {
        #[arg(short, long)]
        archive: PathBuf,

        #[arg(short, long)]
        mount_point: PathBuf,

        #[arg(long, conflicts_with = "password_stdin")]
        password: Option<String>,

        #[arg(long, default_value = "false")]
        password_stdin: bool,
    },
}

#[derive(clap::ValueEnum, Clone, Copy)]
enum LevelArg {
    Fast,
    Balanced,
    Maximum,
}

#[derive(clap::ValueEnum, Clone, Copy)]
enum CodecArg {
    Store,
    Zstd,
    Lz4,
    Lzma2,
}

#[derive(clap::ValueEnum, Clone, Copy)]
enum EccLevelArg {
    Low,
    Medium,
    High,
}

impl From<LevelArg> for CompressionLevel {
    fn from(a: LevelArg) -> Self {
        match a {
            LevelArg::Fast     => CompressionLevel::Fast,
            LevelArg::Balanced => CompressionLevel::Balanced,
            LevelArg::Maximum  => CompressionLevel::Maximum,
        }
    }
}

impl From<CodecArg> for Codec {
    fn from(a: CodecArg) -> Self {
        match a {
            CodecArg::Store => Codec::Store,
            CodecArg::Zstd  => Codec::Zstd,
            CodecArg::Lz4   => Codec::Lz4,
            CodecArg::Lzma2 => Codec::Lzma2,
        }
    }
}

impl From<EccLevelArg> for EccLevel {
    fn from(a: EccLevelArg) -> Self {
        match a {
            EccLevelArg::Low    => EccLevel::Low,
            EccLevelArg::Medium => EccLevel::Medium,
            EccLevelArg::High   => EccLevel::High,
        }
    }
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

/// Read a password from stdin without echoing it to the terminal.
fn read_password_from_stdin() -> Result<String> {
    rpassword::read_password()
        .context("Failed to read password from stdin")
}

/// Resolve the effective password from the three possible sources.
///
/// Priority order (highest first):
///   1. `--password-stdin` flag → prompt from stdin (no echo)
///   2. `--password <value>` flag
///   3. `DODAZIP_PASSWORD` environment variable
fn resolve_password(password: Option<String>, password_stdin: bool) -> Result<Option<String>> {
    if password_stdin {
        eprint!("Password: ");
        return Ok(Some(read_password_from_stdin()?));
    }
    if let Some(p) = password {
        return Ok(Some(p));
    }
    if let Ok(p) = std::env::var("DODAZIP_PASSWORD") {
        return Ok(Some(p));
    }
    Ok(None)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Compress { output, level, codec, dedup, password, password_stdin, ecc, inputs } => {
            let pw = resolve_password(password, password_stdin)?;
            compress_command(&output, level, codec, dedup, pw.as_deref(), ecc, &inputs)
        }
        Commands::Extract { output, password, password_stdin, archive } => {
            let pw = resolve_password(password, password_stdin)?;
            extract_command(&output, pw.as_deref(), &archive)
        }
        Commands::List { password, password_stdin, archive } => {
            let pw = resolve_password(password, password_stdin)?;
            list_command(pw.as_deref(), &archive)
        }
        Commands::Bench { file } => {
            bench_command(&file)
        }
        #[cfg(feature = "fuse")]
        Commands::Mount { archive, mount_point, password, password_stdin } => {
            let pw = resolve_password(password, password_stdin)?;
            mount_command(&archive, &mount_point, pw.as_deref())
        }
    }
}

// ---------------------------------------------------------------------------
// Sub-commands
// ---------------------------------------------------------------------------

#[cfg(feature = "fuse")]
fn mount_command(archive: &PathBuf, mount_point: &PathBuf, password: Option<&str>) -> Result<()> {
    use std::fs;

    if !fs::metadata(archive)?.is_file() {
        anyhow::bail!("Not a file: {:?}", archive);
    }
    if !fs::metadata(mount_point)?.is_dir() {
        anyhow::bail!("Mount point is not a directory: {:?}", mount_point);
    }

    println!("Mounting archive: {:?}", archive);
    println!("Mount point:      {:?}", mount_point);
    if password.is_some() {
        println!("Password protection: enabled");
    }
    println!("\nPress Ctrl+C to unmount...");

    dodazip::fuse::mount_archive(archive, mount_point, password)
        .with_context(|| format!("Failed to mount {:?} to {:?}", archive, mount_point))
}

fn compress_command(
    output:   &PathBuf,
    level:    LevelArg,
    codec:    CodecArg,
    dedup:    bool,
    password: Option<&str>,
    ecc:      Option<EccLevelArg>,
    inputs:   &[PathBuf],
) -> Result<()> {
    use std::fs::File;
    use std::time::Instant;

    let fmt = detect_format(output);
    if fmt != "dzip" {
        return compress_foreign(output, fmt, inputs);
    }

    println!("Creating archive: {:?}", output);
    println!(
        "Codec: {}, Level: {}, Deduplication: {}",
        match codec {
            CodecArg::Store => "Store",
            CodecArg::Zstd  => "Zstd",
            CodecArg::Lz4   => "LZ4",
            CodecArg::Lzma2 => "LZMA2",
        },
        match level {
            LevelArg::Fast     => "Fast",
            LevelArg::Balanced => "Balanced",
            LevelArg::Maximum  => "Maximum",
        },
        dedup,
    );
    if password.is_some() {
        println!("Encryption: XChaCha20-Poly1305 + Argon2id");
    }
    if let Some(e) = ecc {
        println!(
            "ECC: {} parity shard(s) per chunk (self-healing)",
            match e {
                EccLevelArg::Low    => "2",
                EccLevelArg::Medium => "4",
                EccLevelArg::High   => "8",
            }
        );
    }

    let start = Instant::now();

    let mut builder = ArchiveBuilder::new()
        .with_codec(codec.into())
        .with_level(level.into())
        .with_deduplication(dedup)
        .with_password(password.map(|s| s.to_string()))
        .with_ecc(ecc.map(|e| e.into()));

    // FIX: the old code walked directories twice — once inside add_directory
    // and again in a separate walkdir loop to sum up sizes.  This is a race
    // condition (files can change between the two walks) and wastes I/O.
    // We now track total_input_size from the metadata collected during the
    // single add_file / add_directory pass.
    let mut total_input_size: u64 = 0;

    for input in inputs {
        let metadata = std::fs::metadata(input)
            .with_context(|| format!("Failed to read input: {:?}", input))?;

        if metadata.is_file() {
            total_input_size += metadata.len();
            builder.add_file(input, None)?;
            println!("  Added file: {:?}", input);
        } else if metadata.is_dir() {
            println!("  Adding directory: {:?}", input);
            let dir_size = add_directory_tracking_size(&mut builder, input)?;
            total_input_size += dir_size;
        }
    }

    // FIX: write to a temp file first; rename atomically on success.
    // The old code created the output file immediately, leaving a partial /
    // corrupt archive on any build failure.
    let tmp_path = output.with_extension("dz.tmp");
    {
        let file = File::create(&tmp_path)
            .with_context(|| format!("Failed to create temp file: {:?}", tmp_path))?;
        let mut writer = std::io::BufWriter::new(file);
        builder.build(&mut writer)
            .with_context(|| "Archive build failed")?;
    }
    std::fs::rename(&tmp_path, output)
        .with_context(|| format!("Failed to rename {:?} to {:?}", tmp_path, output))?;

    let output_size = std::fs::metadata(output)?.len();
    let elapsed     = start.elapsed();
    let ratio = if output_size > 0 {
        total_input_size as f64 / output_size as f64
    } else {
        0.0
    };

    println!("\n=== Compression Complete ===");
    println!("  Input size:  {} bytes", total_input_size);
    println!("  Output size: {} bytes", output_size);
    println!("  Ratio:       {:.2}x", ratio);
    println!(
        "  Space saved: {:.1}%",
        100.0 - (output_size as f64 / total_input_size.max(1) as f64 * 100.0)
    );
    println!("  Time:        {:.2?}", elapsed);

    Ok(())
}

fn compress_foreign(output: &PathBuf, fmt: &str, inputs: &[PathBuf]) -> Result<()> {
    use std::time::Instant;

    println!("Creating archive: {:?} ({})", output, fmt);
    let start = Instant::now();

    match fmt {
        "zip" => {
            let file = File::create(output)?;
            let mut zip = zip::ZipWriter::new(file);
            for input in inputs {
                let path = Path::new(input);
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                if path.is_dir() {
                    add_dir_to_zip(&mut zip, path, &name)?;
                } else {
                    let opts = get_optimal_zip_options(path);
                    zip.start_file(&name, opts)?;
                    let mut f = File::open(path)?;
                    std::io::copy(&mut f, &mut zip)?;
                }
            }
            zip.finish()?;
        }
        "7z" => {
            let mut sevenz = sevenz_rust::SevenZWriter::create(output)?;
            for input in inputs {
                let path = Path::new(input);
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                if path.is_dir() {
                    add_dir_to_7z(&mut sevenz, path, &name)?;
                } else {
                    let entry = sevenz_rust::SevenZArchiveEntry::from_path(path, name);
                    sevenz.push_archive_entry(entry, Some(File::open(path)?))?;
                }
            }
            sevenz.finish()?;
        }
        "tar" => {
            let file = File::create(output)?;
            let mut builder = tar::Builder::new(file);
            for input in inputs {
                let path = Path::new(input);
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                if path.is_dir() {
                    builder.append_dir_all(&name, path)?;
                } else {
                    builder.append_path_with_name(path, &name)?;
                }
            }
            builder.finish()?;
        }
        "tar.gz" => {
            let file = File::create(output)?;
            let encoder = flate2::write::GzEncoder::new(file, flate2::Compression::default());
            let mut builder = tar::Builder::new(encoder);
            for input in inputs {
                let path = Path::new(input);
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                if path.is_dir() {
                    builder.append_dir_all(&name, path)?;
                } else {
                    builder.append_path_with_name(path, &name)?;
                }
            }
            let encoder = builder.into_inner()?;
            encoder.finish()?;
        }
        "tar.bz2" => {
            let file = File::create(output)?;
            let encoder = bzip2::write::BzEncoder::new(file, bzip2::Compression::default());
            let mut builder = tar::Builder::new(encoder);
            for input in inputs {
                let path = Path::new(input);
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                if path.is_dir() {
                    builder.append_dir_all(&name, path)?;
                } else {
                    builder.append_path_with_name(path, &name)?;
                }
            }
            let encoder = builder.into_inner()?;
            encoder.finish()?;
        }
        "tar.xz" => {
            let file = File::create(output)?;
            let encoder = xz2::write::XzEncoder::new(file, 6);
            let mut builder = tar::Builder::new(encoder);
            for input in inputs {
                let path = Path::new(input);
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                if path.is_dir() {
                    builder.append_dir_all(&name, path)?;
                } else {
                    builder.append_path_with_name(path, &name)?;
                }
            }
            let encoder = builder.into_inner()?;
            encoder.finish()?;
        }
        "gz" | "bz2" | "xz" => {
            if inputs.len() > 1 {
                anyhow::bail!("Multiple files require .tar.{ext} instead of .{ext}", ext = fmt);
            }
            let input = &inputs[0];
            let mut in_file = File::open(Path::new(input))?;
            let out_file = File::create(output)?;
            match fmt {
                "gz" => {
                    let mut encoder = flate2::write::GzEncoder::new(out_file, flate2::Compression::default());
                    std::io::copy(&mut in_file, &mut encoder)?;
                    encoder.finish()?;
                }
                "bz2" => {
                    let mut encoder = bzip2::write::BzEncoder::new(out_file, bzip2::Compression::default());
                    std::io::copy(&mut in_file, &mut encoder)?;
                    encoder.finish()?;
                }
                "xz" => {
                    let mut encoder = xz2::write::XzEncoder::new(out_file, 6);
                    std::io::copy(&mut in_file, &mut encoder)?;
                    encoder.finish()?;
                }
                _ => unreachable!()
            }
        }
        _ => anyhow::bail!("Unsupported output format: {}", fmt),
    }

    let elapsed = start.elapsed();
    let output_size = std::fs::metadata(output)?.len();
    println!("\n=== Compression Complete ===");
    println!("  Output size: {} bytes", output_size);
    println!("  Time:        {:.2?}", elapsed);

    Ok(())
}

fn is_already_compressed(path: &Path) -> bool {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    matches!(
        ext.as_str(),
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "mp4" | "mkv" | "avi" | "mov" | "mp3" | "zip" | "7z" | "rar" | "gz" | "bz2" | "xz" | "dzip"
    )
}

fn get_optimal_zip_options<'a>(path: &Path) -> zip::write::FileOptions<'a, ()> {
    if is_already_compressed(path) {
        zip::write::FileOptions::<()>::default()
            .compression_method(zip::CompressionMethod::Stored)
    } else {
        zip::write::FileOptions::<()>::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .compression_level(Some(9))
    }
}

fn add_dir_to_zip<W: std::io::Write + std::io::Seek>(
    zip: &mut zip::ZipWriter<W>,
    dir: &Path,
    prefix: &str,
) -> Result<()> {
    for entry in walkdir::WalkDir::new(dir) {
        let entry = entry?;
        let rel = entry.path().strip_prefix(dir).unwrap();
        let name = Path::new(prefix).join(rel).to_string_lossy().to_string();
        if entry.file_type().is_dir() {
            let dir_opts = zip::write::FileOptions::<()>::default();
            zip.add_directory(name, dir_opts)?;
        } else {
            let file_opts = get_optimal_zip_options(entry.path());
            zip.start_file(name, file_opts)?;
            let mut f = File::open(entry.path())?;
            std::io::copy(&mut f, zip)?;
        }
    }
    Ok(())
}

fn add_dir_to_7z(
    sevenz: &mut sevenz_rust::SevenZWriter<File>,
    dir: &Path,
    prefix: &str,
) -> Result<()> {
    for entry in walkdir::WalkDir::new(dir) {
        let entry = entry?;
        if entry.file_type().is_dir() { continue; }
        let rel = entry.path().strip_prefix(dir).unwrap();
        let name = Path::new(prefix).join(rel).to_string_lossy().to_string();
        let e = sevenz_rust::SevenZArchiveEntry::from_path(entry.path(), name);
        sevenz.push_archive_entry(e, Some(File::open(entry.path())?))?;
    }
    Ok(())
}

/// Add a directory to the builder while also summing file sizes.
/// This replaces the old two-pass approach (add_directory + separate walkdir).
fn add_directory_tracking_size(
    builder: &mut ArchiveBuilder,
    dir:     &PathBuf,
) -> Result<u64> {
    let mut total = 0u64;
    for entry in walkdir::WalkDir::new(dir) {
        let entry = entry.with_context(|| format!("Error walking {:?}", dir))?;
        if entry.file_type().is_file() {
            let meta = entry.metadata()
                .with_context(|| format!("Failed to read metadata for {:?}", entry.path()))?;
            total += meta.len();

            let rel_path = entry
                .path()
                .strip_prefix(dir)
                .unwrap_or(entry.path())
                .to_string_lossy()
                .to_string();

            builder.add_file(entry.path(), Some(&rel_path))?;
            println!("    Added: {}", rel_path);
        }
    }
    Ok(total)
}

fn detect_format(path: &Path) -> &'static str {
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    if name.ends_with(".tar.gz") || name.ends_with(".tgz") {
        return "tar.gz";
    }
    if name.ends_with(".tar.bz2") || name.ends_with(".tbz2") {
        return "tar.bz2";
    }
    if name.ends_with(".tar.xz") || name.ends_with(".txz") {
        return "tar.xz";
    }
    match path.extension().and_then(|e| e.to_str()).unwrap_or("") {
        e if e.eq_ignore_ascii_case("dzip") => "dzip",
        e if e.eq_ignore_ascii_case("zip") => "zip",
        e if e.eq_ignore_ascii_case("7z") => "7z",
        e if e.eq_ignore_ascii_case("rar") => "rar",
        e if e.eq_ignore_ascii_case("tar") => "tar",
        e if e.eq_ignore_ascii_case("gz") => "gz",
        e if e.eq_ignore_ascii_case("bz2") => "bz2",
        e if e.eq_ignore_ascii_case("xz") => "xz",
        _ => "dzip",
    }
}

fn list_tar_entries(path: &Path) -> Result<Vec<(String, u64)>> {
    let file = std::fs::File::open(path)?;
    let mut archive = tar::Archive::new(file);
    let mut entries = Vec::new();
    for entry in archive.entries()? {
        let entry = entry?;
        let path = entry.path()?.to_string_lossy().to_string();
        if path.ends_with('/') { continue; }
        entries.push((path, entry.size()));
    }
    Ok(entries)
}

fn list_targz_entries(path: &Path) -> Result<Vec<(String, u64)>> {
    let file = std::fs::File::open(path)?;
    let decoder = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    let mut entries = Vec::new();
    for entry in archive.entries()? {
        let entry = entry?;
        let path = entry.path()?.to_string_lossy().to_string();
        if path.ends_with('/') { continue; }
        entries.push((path, entry.size()));
    }
    Ok(entries)
}

fn list_tarbz2_entries(path: &Path) -> Result<Vec<(String, u64)>> {
    let file = std::fs::File::open(path)?;
    let decoder = bzip2::read::BzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    let mut entries = Vec::new();
    for entry in archive.entries()? {
        let entry = entry?;
        let path = entry.path()?.to_string_lossy().to_string();
        if path.ends_with('/') { continue; }
        entries.push((path, entry.size()));
    }
    Ok(entries)
}

fn list_tarxz_entries(path: &Path) -> Result<Vec<(String, u64)>> {
    let file = std::fs::File::open(path)?;
    let decoder = xz2::read::XzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    let mut entries = Vec::new();
    for entry in archive.entries()? {
        let entry = entry?;
        let path = entry.path()?.to_string_lossy().to_string();
        if path.ends_with('/') { continue; }
        entries.push((path, entry.size()));
    }
    Ok(entries)
}

fn list_gz_entry(path: &Path) -> Result<Vec<(String, u64)>> {
    let name = path.file_name().unwrap().to_string_lossy().to_string();
    let base = name.strip_suffix(".gz").unwrap_or(&name).to_string();
    let file = std::fs::File::open(path)?;
    let mut decoder = flate2::read::GzDecoder::new(file);
    let mut data = Vec::new();
    decoder.read_to_end(&mut data)?;
    Ok(vec![(base, data.len() as u64)])
}

fn list_bz2_entry(path: &Path) -> Result<Vec<(String, u64)>> {
    let name = path.file_name().unwrap().to_string_lossy().to_string();
    let base = name.strip_suffix(".bz2").unwrap_or(&name).to_string();
    let file = std::fs::File::open(path)?;
    let mut decoder = bzip2::read::BzDecoder::new(file);
    let mut data = Vec::new();
    decoder.read_to_end(&mut data)?;
    Ok(vec![(base, data.len() as u64)])
}

fn list_xz_entry(path: &Path) -> Result<Vec<(String, u64)>> {
    let name = path.file_name().unwrap().to_string_lossy().to_string();
    let base = name.strip_suffix(".xz").unwrap_or(&name).to_string();
    let file = std::fs::File::open(path)?;
    let mut decoder = xz2::read::XzDecoder::new(file);
    let mut data = Vec::new();
    decoder.read_to_end(&mut data)?;
    Ok(vec![(base, data.len() as u64)])
}

fn extract_command(output: &PathBuf, password: Option<&str>, archive: &PathBuf) -> Result<()> {
    use std::fs::File;
    use std::time::Instant;

    println!("Extracting archive: {:?} ({})", archive, detect_format(archive));
    println!("To: {:?}", output);

    let start = Instant::now();
    let entry_count;

    std::fs::create_dir_all(output)?;

    match detect_format(archive) {
        "dzip" => {
            let file = File::open(archive)
                .with_context(|| format!("Failed to open archive: {:?}", archive))?;
            let mut reader = std::io::BufReader::new(file);
            let mut arc = ArchiveReader::new(&mut reader, password)?;
            if arc.is_encrypted() {
                println!("Archive is encrypted — password verified");
            }
            entry_count = arc.entries().len();
            arc.extract_all(output)?;
        }
        "zip" => {
            let file = File::open(archive)?;
            let mut zip = zip::ZipArchive::new(file)
                .with_context(|| "Failed to read ZIP archive")?;
            entry_count = zip.len();
            for i in 0..zip.len() {
                let mut entry = zip.by_index(i)?;
                if entry.is_dir() { continue; }
                let out_path = output.join(entry.name());
                if let Some(parent) = out_path.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                let mut out_file = File::create(&out_path)?;
                std::io::copy(&mut entry, &mut out_file)?;
            }
        }
        "7z" => {
            let mut sevenz = sevenz_rust::SevenZReader::open(
                archive,
                sevenz_rust::Password::empty(),
            ).with_context(|| "Failed to read 7z archive")?;
            entry_count = sevenz.archive().files.len();
            sevenz.for_each_entries(|entry, reader| -> Result<bool, sevenz_rust::Error> {
                if entry.is_directory() { return Ok(true); }
                let out_path = output.join(&entry.name);
                if let Some(parent) = out_path.parent() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| sevenz_rust::Error::io(e))?;
                }
                let mut out_file = File::create(&out_path)
                    .map_err(|e| sevenz_rust::Error::io(e))?;
                std::io::copy(reader, &mut out_file)
                    .map_err(|e| sevenz_rust::Error::io(e))?;
                Ok(true)
            })?;
        }
        "rar" => {
            let mut rar_archive = unrar::Archive::new(archive).open_for_processing()
                .with_context(|| "Failed to open RAR archive")?;
            let mut count = 0;
            while let Some(header) = rar_archive.read_header()
                .with_context(|| "Failed to read RAR header")? {
                let entry = header.entry();
                if entry.is_directory() {
                    rar_archive = header.skip()?;
                    continue;
                }
                count += 1;
                let rel_path = entry.filename.to_string_lossy().to_string();
                let out_path = output.join(&rel_path);
                if let Some(parent) = out_path.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                let (data, next) = header.read()
                    .with_context(|| "Failed to read RAR entry")?;
                std::fs::write(&out_path, &data)?;
                rar_archive = next;
            }
            entry_count = count;
        }
        "tar" => {
            let file = File::open(archive)?;
            let (count, _) = extract_tar_container(file, output)?;
            entry_count = count as usize;
        }
        "tar.gz" => {
            let file = File::open(archive)?;
            let decoder = flate2::read::GzDecoder::new(file);
            let (count, _) = extract_tar_container(decoder, output)?;
            entry_count = count as usize;
        }
        "tar.bz2" => {
            let file = File::open(archive)?;
            let decoder = bzip2::read::BzDecoder::new(file);
            let (count, _) = extract_tar_container(decoder, output)?;
            entry_count = count as usize;
        }
        "tar.xz" => {
            let file = File::open(archive)?;
            let decoder = xz2::read::XzDecoder::new(file);
            let (count, _) = extract_tar_container(decoder, output)?;
            entry_count = count as usize;
        }
        "gz" => {
            let name = archive.file_name().unwrap().to_string_lossy().to_string();
            let out_name = name.strip_suffix(".gz").unwrap_or(&name);
            let out_path = output.join(out_name);
            let mut decoder = flate2::read::GzDecoder::new(File::open(archive)?);
            let mut out_file = File::create(&out_path)?;
            std::io::copy(&mut decoder, &mut out_file)?;
            entry_count = 1;
        }
        "bz2" => {
            let name = archive.file_name().unwrap().to_string_lossy().to_string();
            let out_name = name.strip_suffix(".bz2").unwrap_or(&name);
            let out_path = output.join(out_name);
            let mut decoder = bzip2::read::BzDecoder::new(File::open(archive)?);
            let mut out_file = File::create(&out_path)?;
            std::io::copy(&mut decoder, &mut out_file)?;
            entry_count = 1;
        }
        "xz" => {
            let name = archive.file_name().unwrap().to_string_lossy().to_string();
            let out_name = name.strip_suffix(".xz").unwrap_or(&name);
            let out_path = output.join(out_name);
            let mut decoder = xz2::read::XzDecoder::new(File::open(archive)?);
            let mut out_file = File::create(&out_path)?;
            std::io::copy(&mut decoder, &mut out_file)?;
            entry_count = 1;
        }
        _ => {
            let file = File::open(archive)?;
            let mut reader = std::io::BufReader::new(file);
            let mut arc = ArchiveReader::new(&mut reader, password)?;
            entry_count = arc.entries().len();
            arc.extract_all(output)?;
        }
    }

    let elapsed = start.elapsed();
    println!("\n=== Extraction Complete ===");
    println!("  Extracted {} files", entry_count);
    println!("  Time: {:.2?}", elapsed);

    Ok(())
}

fn extract_tar_container<R: Read>(reader: R, output: &Path) -> Result<(u64, Vec<(String, u64)>)> {
    let mut archive = tar::Archive::new(reader);
    let mut entries = Vec::new();
    for entry_res in archive.entries()? {
        let mut entry = entry_res?;
        let path = entry.path()?.to_string_lossy().to_string();
        let size = entry.size();
        if path.ends_with('/') {
            let out_path = output.join(&path);
            std::fs::create_dir_all(&out_path)?;
            continue;
        }
        entries.push((path.clone(), size));
        let out_path = output.join(&path);
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut out_file = File::create(&out_path)?;
        std::io::copy(&mut entry, &mut out_file)?;
    }
    Ok((entries.len() as u64, entries))
}

fn list_command(password: Option<&str>, archive: &PathBuf) -> Result<()> {
    use std::fs::File;

    println!("Archive: {:?} ({})", archive, detect_format(archive));

    let entries: Vec<(String, u64)> = match detect_format(archive) {
        "dzip" => {
            let file = File::open(archive)?;
            let mut reader = std::io::BufReader::new(file);
            let arc = ArchiveReader::new(&mut reader, password)?;
            if arc.is_encrypted() {
                println!("Encryption: XChaCha20-Poly1305");
            }
            arc.entries().iter().map(|e| (e.path.clone(), e.file_size)).collect()
        }
        "zip" => {
            let file = File::open(archive)?;
            let mut zip = zip::ZipArchive::new(file)?;
            (0..zip.len()).filter_map(|i| {
                let entry = zip.by_index(i).ok()?;
                if entry.is_dir() { return None; }
                Some((entry.name().to_string(), entry.size()))
            }).collect()
        }
        "7z" => {
            let sevenz = sevenz_rust::SevenZReader::open(
                archive,
                sevenz_rust::Password::empty(),
            )?;
            let files = &sevenz.archive().files;
            files.iter().filter_map(|e| {
                if e.is_directory() { return None; }
                Some((e.name.clone(), e.size))
            }).collect()
        }
        "rar" => {
            let rar = unrar::Archive::new(archive).open_for_listing()?;
            rar.filter_map(|e| {
                let entry = e.ok()?;
                if entry.is_directory() { return None; }
                Some((entry.filename.to_string_lossy().to_string(), entry.unpacked_size))
            }).collect()
        }
        "tar" => list_tar_entries(archive)?,
        "tar.gz" => list_targz_entries(archive)?,
        "tar.bz2" => list_tarbz2_entries(archive)?,
        "tar.xz" => list_tarxz_entries(archive)?,
        "gz" => list_gz_entry(archive)?,
        "bz2" => list_bz2_entry(archive)?,
        "xz" => list_xz_entry(archive)?,
        _ => {
            let file = File::open(archive)?;
            let mut reader = std::io::BufReader::new(file);
            let arc = ArchiveReader::new(&mut reader, password)?;
            arc.entries().iter().map(|e| (e.path.clone(), e.file_size)).collect()
        }
    };

    println!("\nArchive contents:\n");
    for (path, size) in &entries {
        println!("  {:>12}  {}", size, path);
    }

    println!("\nSummary:");
    println!("  Total files: {}", entries.len());
    println!("  Total size:  {} bytes", entries.iter().map(|(_, s)| s).sum::<u64>());

    Ok(())
}

fn bench_command(file: &Option<PathBuf>) -> Result<()> {
    let test_data = if let Some(path) = file {
        std::fs::read(path)?
    } else {
        generate_test_data(10 * 1024 * 1024)
    };

    println!("Running benchmarks with {} bytes of test data...\n", test_data.len());
    archive::benchmark_compression(&test_data);
    Ok(())
}

fn generate_test_data(size: usize) -> Vec<u8> {
    let mut result = Vec::with_capacity(size);
    let patterns: [&[u8]; 4] = [
        b"The quick brown fox jumps over the lazy dog. ",
        b"Pack my box with five dozen liquor jugs. ",
        b"How vexingly quick daft zebras jump! ",
        b"0123456789ABCDEF",
    ];

    let mut i = 0;
    while result.len() < size {
        let pattern = patterns[i % patterns.len()];
        let repeat  = ((i * 7) % 5) + 1;
        for _ in 0..repeat {
            if result.len() + pattern.len() <= size {
                result.extend_from_slice(pattern);
            } else {
                let remaining = size - result.len();
                result.extend_from_slice(&pattern[..remaining]);
                break;
            }
        }
        i += 1;
    }

    result
}
