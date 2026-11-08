#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Read;
use std::path::{Path, PathBuf};

use std::collections::HashMap;

use dodazip::{
    ArchiveBuilder, ArchiveReader, Codec, CompressionLevel, EccLevel,
    secure_delete, split_archive_into_volumes,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

fn format_name(path: &Path) -> String {
    path.to_string_lossy().to_lowercase()
}

fn detect_format(path: &Path) -> &'static str {
    let name = format_name(path);
    if name.ends_with(".tar.gz") || name.ends_with(".tgz") { return "tar.gz"; }
    if name.ends_with(".tar.bz2") || name.ends_with(".tbz2") { return "tar.bz2"; }
    if name.ends_with(".tar.xz") || name.ends_with(".txz") { return "tar.xz"; }
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

fn detect_output_format(path: &Path) -> &'static str {
    let name = format_name(path);
    if name.ends_with(".tar.gz") || name.ends_with(".tgz") { return "tar.gz"; }
    if name.ends_with(".tar.bz2") || name.ends_with(".tbz2") { return "tar.bz2"; }
    if name.ends_with(".tar.xz") || name.ends_with(".txz") { return "tar.xz"; }
    match path.extension().and_then(|e| e.to_str()).unwrap_or("") {
        e if e.eq_ignore_ascii_case("zip") => "zip",
        e if e.eq_ignore_ascii_case("7z") => "7z",
        e if e.eq_ignore_ascii_case("tar") => "tar",
        e if e.eq_ignore_ascii_case("gz") => "gz",
        e if e.eq_ignore_ascii_case("bz2") => "bz2",
        e if e.eq_ignore_ascii_case("xz") => "xz",
        _ => "dzip",
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub is_dir: bool,
    pub is_file: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveEntry {
    pub path: String,
    pub size: u64,
    pub chunks: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionOptions {
    pub codec: String,
    pub level: String,
    pub dedup: bool,
    pub password: Option<String>,
    pub ecc_level: Option<String>,
    pub split_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractionOptions {
    pub password: Option<String>,
    pub smart_unpack: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyResult {
    pub valid: bool,
    pub entries: usize,
    pub total_size: u64,
    pub error: Option<String>,
}

fn get_home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
}

fn parse_codec(s: &str) -> Codec {
    match s.to_lowercase().as_str() {
        "store" => Codec::Store,
        "zstd" => Codec::Zstd,
        "lz4" => Codec::Lz4,
        "lzma2" => Codec::Lzma2,
        _ => Codec::Zstd,
    }
}

fn parse_level(s: &str) -> CompressionLevel {
    match s.to_lowercase().as_str() {
        "fast" => CompressionLevel::Fast,
        "balanced" => CompressionLevel::Balanced,
        "maximum" => CompressionLevel::Maximum,
        _ => CompressionLevel::Balanced,
    }
}

fn parse_ecc_level(s: &str) -> EccLevel {
    match s.to_lowercase().as_str() {
        "low" => EccLevel::Low,
        "medium" => EccLevel::Medium,
        "high" => EccLevel::High,
        _ => EccLevel::Low,
    }
}

#[tauri::command]
async fn list_directory(path: Option<String>) -> Result<Vec<FileInfo>, String> {
    let dir_path = path
        .map(PathBuf::from)
        .unwrap_or_else(get_home_dir);

    let mut entries = Vec::new();

    if let Some(parent) = dir_path.parent() {
        entries.push(FileInfo {
            path: parent.to_string_lossy().to_string(),
            name: "..".to_string(),
            size: 0,
            is_dir: true,
            is_file: false,
        });
    }

    let read_dir = std::fs::read_dir(&dir_path)
        .map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        
        entries.push(FileInfo {
            path: entry.path().to_string_lossy().to_string(),
            name: entry.file_name().to_string_lossy().to_string(),
            size: metadata.len(),
            is_dir: metadata.is_dir(),
            is_file: metadata.is_file(),
        });
    }

    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            a.is_dir.cmp(&b.is_dir).reverse()
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(entries)
}

fn is_already_compressed_tauri(path: &Path) -> bool {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    matches!(
        ext.as_str(),
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "mp4" | "mkv" | "avi" | "mov" | "mp3" | "zip" | "7z" | "rar" | "gz" | "bz2" | "xz" | "dzip"
    )
}

fn get_optimal_zip_options_tauri(path: &Path) -> zip::write::SimpleFileOptions {
    if is_already_compressed_tauri(path) {
        zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored)
    } else {
        zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .compression_level(Some(9))
    }
}

fn add_dir_to_zip(zip: &mut zip::ZipWriter<std::fs::File>, dir: &Path, root: &Path) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = path.strip_prefix(root).unwrap()
            .to_string_lossy().replace('\\', "/");
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            let dir_opts = zip::write::SimpleFileOptions::default();
            zip.add_directory(&name, dir_opts)
                .map_err(|e| format!("Failed to add dir to zip: {}", e))?;
            add_dir_to_zip(zip, &path, root)?;
        } else {
            let file_opts = get_optimal_zip_options_tauri(&path);
            zip.start_file(&name, file_opts)
                .map_err(|e| format!("Failed to add file to zip: {}", e))?;
            let mut f = std::fs::File::open(&path)
                .map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;
            std::io::copy(&mut f, zip)
                .map_err(|e| format!("Failed to write to zip: {}", e))?;
        }
    }
    Ok(())
}

fn compress_zip(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    let file = std::fs::File::create(output)
        .map_err(|e| format!("Failed to create zip: {}", e))?;
    let mut zip = zip::ZipWriter::new(file);

    for input in &inputs {
        let path = Path::new(input);
        if path.is_dir() {
            let dir_opts = zip::write::SimpleFileOptions::default();
            zip.add_directory(path.file_name().unwrap().to_string_lossy(), dir_opts)
                .map_err(|e| format!("Failed to add dir: {}", e))?;
            add_dir_to_zip(&mut zip, path, path)?;
        } else {
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            let file_opts = get_optimal_zip_options_tauri(path);
            zip.start_file(&name, file_opts)
                .map_err(|e| format!("Failed to add file to zip: {}", e))?;
            let mut f = std::fs::File::open(path)
                .map_err(|e| format!("Failed to open {}: {}", input, e))?;
            std::io::copy(&mut f, &mut zip)
                .map_err(|e| format!("Failed to write to zip: {}", e))?;
        }
    }

    zip.finish().map_err(|e| format!("Failed to finalize zip: {}", e))?;
    Ok(())
}

fn compress_sevenz(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    let mut sz = sevenz_rust::SevenZWriter::create(output)
        .map_err(|e| format!("Failed to create 7z: {}", e))?;

    for input in &inputs {
        let path = Path::new(input);
        if path.is_dir() {
            sz.push_source_path(path, |_| true)
                .map_err(|e| format!("Failed to add directory to 7z: {}", e))?;
        } else {
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            let entry = sevenz_rust::SevenZArchiveEntry::from_path(path, name);
            let file = std::fs::File::open(path)
                .map_err(|e| format!("Failed to open {}: {}", input, e))?;
            sz.push_archive_entry(entry, Some(file))
                .map_err(|e| format!("Failed to add file to 7z: {}", e))?;
        }
    }

    sz.finish().map_err(|e| format!("Failed to finalize 7z: {}", e))?;
    Ok(())
}

async fn compress_dzip(app_handle: AppHandle, inputs: Vec<String>, output: &Path, options: CompressionOptions) -> Result<(), String> {
    let total = inputs.len();
    let _ = app_handle.emit("compress_progress", 0u32);
    
    let mut builder = ArchiveBuilder::new()
        .with_codec(parse_codec(&options.codec))
        .with_level(parse_level(&options.level))
        .with_deduplication(options.dedup)
        .with_password(options.password);

    if let Some(ecc) = options.ecc_level {
        builder = builder.with_ecc(Some(parse_ecc_level(&ecc)));
    }

    for (i, input) in inputs.iter().enumerate() {
        let input_path = PathBuf::from(input);
        let metadata = std::fs::metadata(&input_path)
            .map_err(|e| format!("Failed to read input {}: {}", input, e))?;

        if metadata.is_file() {
            builder.add_file(&input_path, None)
                .map_err(|e| e.to_string())?;
        } else if metadata.is_dir() {
            builder.add_directory(&input_path, None)
                .map_err(|e| e.to_string())?;
        }
        let pct = ((i + 1) * 70 / total) as u32;
        let _ = app_handle.emit("compress_progress", pct);
    }

    let file = std::fs::File::create(output)
        .map_err(|e| format!("Failed to create output: {}", e))?;
    
    let mut writer = std::io::BufWriter::new(file);
    builder.build(&mut writer)
        .map_err(|e| e.to_string())?;
    
    let _ = app_handle.emit("compress_progress", 100u32);
    Ok(())
}

fn list_dzip_entries(path: &Path, password: Option<&str>) -> Result<Vec<ArchiveEntry>, String> {
    let file = std::fs::File::open(path)
        .map_err(|e| format!("Failed to open archive: {}", e))?;
    let mut reader = std::io::BufReader::new(file);
    let archive = ArchiveReader::new(&mut reader, password).map_err(|e| e.to_string())?;
    Ok(archive.entries().iter().map(|e| ArchiveEntry {
        path: e.path.clone(),
        size: e.file_size,
        chunks: e.chunk_refs.len(),
    }).collect())
}

fn list_zip_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let file = std::fs::File::open(path)
        .map_err(|e| format!("Failed to open archive: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;
    let mut entries = Vec::with_capacity(archive.len());
    for i in 0..archive.len() {
        let entry = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;
        let name = entry.name().to_string();
        let size = entry.size();
        let is_dir = entry.is_dir();
        if !is_dir {
            entries.push(ArchiveEntry { path: name, size, chunks: 0 });
        }
    }
    Ok(entries)
}

fn list_sevenz_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let archive = sevenz_rust::SevenZReader::open(path, sevenz_rust::Password::empty())
        .map_err(|e| format!("Failed to read 7z archive: {}", e))?;
    Ok(archive.archive().files.iter().filter_map(|e| {
        if e.is_directory() { return None; }
        Some(ArchiveEntry { path: e.name.clone(), size: e.size, chunks: 0 })
    }).collect())
}

fn list_rar_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let archive = unrar::Archive::new(path).open_for_listing()
        .map_err(|e| format!("Failed to open RAR archive: {}", e))?;
    let mut entries = Vec::new();
    for entry in archive {
        let entry = entry.map_err(|e| format!("Failed to read RAR entry: {}", e))?;
        let name = entry.filename.to_string_lossy().to_string();
        let size = entry.unpacked_size;
        if !entry.is_directory() {
            entries.push(ArchiveEntry { path: name, size, chunks: 0 });
        }
    }
    Ok(entries)
}

fn open_tar_list(path: &Path) -> Result<tar::Archive<Box<dyn Read>>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    Ok(tar::Archive::new(Box::new(file)))
}

fn open_targz_list(path: &Path) -> Result<tar::Archive<Box<dyn Read>>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let decoder = flate2::read::GzDecoder::new(file);
    Ok(tar::Archive::new(Box::new(decoder)))
}

fn open_tarbz2_list(path: &Path) -> Result<tar::Archive<Box<dyn Read>>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let decoder = bzip2::read::BzDecoder::new(file);
    Ok(tar::Archive::new(Box::new(decoder)))
}

fn open_tarxz_list(path: &Path) -> Result<tar::Archive<Box<dyn Read>>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let decoder = xz2::read::XzDecoder::new(file);
    Ok(tar::Archive::new(Box::new(decoder)))
}

fn list_tar_archive(mut archive: tar::Archive<Box<dyn Read>>) -> Result<Vec<ArchiveEntry>, String> {
    let mut entries = Vec::new();
    for entry in archive.entries().map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().map_err(|e| e.to_string())?.to_string_lossy().to_string();
        let size = entry.size();
        if path.ends_with('/') { continue; }
        entries.push(ArchiveEntry { path, size, chunks: 0 });
    }
    Ok(entries)
}

fn extract_tar_archive<R: Read>(reader: R, output_dir: &Path) -> Result<(), String> {
    let mut archive = tar::Archive::new(reader);
    archive.unpack(output_dir).map_err(|e| e.to_string())
}

fn open_gz_decompress(path: &Path) -> Result<impl Read, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    Ok(flate2::read::GzDecoder::new(file))
}

fn list_gz_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let name = path.file_name().unwrap().to_string_lossy().to_string();
    let base = name.strip_suffix(".gz").unwrap_or(&name).to_string();
    let mut decoder = open_gz_decompress(path)?;
    let mut data = Vec::new();
    decoder.read_to_end(&mut data).map_err(|e| e.to_string())?;
    Ok(vec![ArchiveEntry { path: base, size: data.len() as u64, chunks: 0 }])
}

fn extract_gz(archive_path: &Path, output_dir: &Path) -> Result<(), String> {
    let name = archive_path.file_name().unwrap().to_string_lossy().to_string();
    let out_name = name.strip_suffix(".gz").unwrap_or(&name);
    let out_path = output_dir.join(out_name);
    let mut decoder = open_gz_decompress(archive_path)?;
    let mut out_file = std::fs::File::create(&out_path)
        .map_err(|e| format!("Failed to create {}: {}", out_path.display(), e))?;
    std::io::copy(&mut decoder, &mut out_file)
        .map_err(|e| format!("Failed to decompress gz: {}", e))?;
    Ok(())
}

fn list_bz2_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let name = path.file_name().unwrap().to_string_lossy().to_string();
    let base = name.strip_suffix(".bz2").unwrap_or(&name).to_string();
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut decoder = bzip2::read::BzDecoder::new(file);
    let mut data = Vec::new();
    decoder.read_to_end(&mut data).map_err(|e| e.to_string())?;
    Ok(vec![ArchiveEntry { path: base, size: data.len() as u64, chunks: 0 }])
}

fn extract_bz2(archive_path: &Path, output_dir: &Path) -> Result<(), String> {
    let name = archive_path.file_name().unwrap().to_string_lossy().to_string();
    let out_name = name.strip_suffix(".bz2").unwrap_or(&name);
    let out_path = output_dir.join(out_name);
    let file = std::fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let mut decoder = bzip2::read::BzDecoder::new(file);
    let mut out_file = std::fs::File::create(&out_path)
        .map_err(|e| format!("Failed to create {}: {}", out_path.display(), e))?;
    std::io::copy(&mut decoder, &mut out_file)
        .map_err(|e| format!("Failed to decompress bz2: {}", e))?;
    Ok(())
}

fn list_xz_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let name = path.file_name().unwrap().to_string_lossy().to_string();
    let base = name.strip_suffix(".xz").unwrap_or(&name).to_string();
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut decoder = xz2::read::XzDecoder::new(file);
    let mut data = Vec::new();
    decoder.read_to_end(&mut data).map_err(|e| e.to_string())?;
    Ok(vec![ArchiveEntry { path: base, size: data.len() as u64, chunks: 0 }])
}

fn extract_xz(archive_path: &Path, output_dir: &Path) -> Result<(), String> {
    let name = archive_path.file_name().unwrap().to_string_lossy().to_string();
    let out_name = name.strip_suffix(".xz").unwrap_or(&name);
    let out_path = output_dir.join(out_name);
    let file = std::fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let mut decoder = xz2::read::XzDecoder::new(file);
    let mut out_file = std::fs::File::create(&out_path)
        .map_err(|e| format!("Failed to create {}: {}", out_path.display(), e))?;
    std::io::copy(&mut decoder, &mut out_file)
        .map_err(|e| format!("Failed to decompress xz: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn list_archive(
    archive_path: String,
    password: Option<String>,
) -> Result<Vec<ArchiveEntry>, String> {
    let path = PathBuf::from(&archive_path);
    match detect_format(&path) {
        "dzip" => list_dzip_entries(&path, password.as_deref()),
        "zip" => list_zip_entries(&path),
        "7z" => list_sevenz_entries(&path),
        "rar" => list_rar_entries(&path),
        "tar" => open_tar_list(&path).and_then(list_tar_archive),
        "tar.gz" => open_targz_list(&path).and_then(list_tar_archive),
        "tar.bz2" => open_tarbz2_list(&path).and_then(list_tar_archive),
        "tar.xz" => open_tarxz_list(&path).and_then(list_tar_archive),
        "gz" => list_gz_entries(&path),
        "bz2" => list_bz2_entries(&path),
        "xz" => list_xz_entries(&path),
        _ => list_dzip_entries(&path, password.as_deref()),
    }
}

fn compress_tar(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    let file = std::fs::File::create(output).map_err(|e| e.to_string())?;
    let mut builder = tar::Builder::new(file);
    for input in &inputs {
        let path = Path::new(input);
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        if path.is_dir() {
            builder.append_dir_all(&name, path).map_err(|e| e.to_string())?;
        } else {
            builder.append_path_with_name(path, &name).map_err(|e| e.to_string())?;
        }
    }
    builder.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn compress_targz(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    let file = std::fs::File::create(output).map_err(|e| e.to_string())?;
    let encoder = flate2::write::GzEncoder::new(file, flate2::Compression::default());
    let mut builder = tar::Builder::new(encoder);
    for input in &inputs {
        let path = Path::new(input);
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        if path.is_dir() {
            builder.append_dir_all(&name, path).map_err(|e| e.to_string())?;
        } else {
            builder.append_path_with_name(path, &name).map_err(|e| e.to_string())?;
        }
    }
    let encoder = builder.into_inner().map_err(|e| e.to_string())?;
    encoder.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn compress_tarbz2(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    let file = std::fs::File::create(output).map_err(|e| e.to_string())?;
    let encoder = bzip2::write::BzEncoder::new(file, bzip2::Compression::default());
    let mut builder = tar::Builder::new(encoder);
    for input in &inputs {
        let path = Path::new(input);
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        if path.is_dir() {
            builder.append_dir_all(&name, path).map_err(|e| e.to_string())?;
        } else {
            builder.append_path_with_name(path, &name).map_err(|e| e.to_string())?;
        }
    }
    let encoder = builder.into_inner().map_err(|e| e.to_string())?;
    encoder.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn compress_tarxz(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    let file = std::fs::File::create(output).map_err(|e| e.to_string())?;
    let encoder = xz2::write::XzEncoder::new(file, 6);
    let mut builder = tar::Builder::new(encoder);
    for input in &inputs {
        let path = Path::new(input);
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        if path.is_dir() {
            builder.append_dir_all(&name, path).map_err(|e| e.to_string())?;
        } else {
            builder.append_path_with_name(path, &name).map_err(|e| e.to_string())?;
        }
    }
    let encoder = builder.into_inner().map_err(|e| e.to_string())?;
    encoder.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn compress_gz(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    if inputs.len() > 1 {
        return Err("Multiple files require .tar.gz instead of .gz".to_string());
    }
    let file = std::fs::File::create(output).map_err(|e| e.to_string())?;
    let mut encoder = flate2::write::GzEncoder::new(file, flate2::Compression::default());
    let path = Path::new(&inputs[0]);
    let mut input_file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    std::io::copy(&mut input_file, &mut encoder).map_err(|e| e.to_string())?;
    encoder.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn compress_bz2(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    if inputs.len() > 1 {
        return Err("Multiple files require .tar.bz2 instead of .bz2".to_string());
    }
    let file = std::fs::File::create(output).map_err(|e| e.to_string())?;
    let mut encoder = bzip2::write::BzEncoder::new(file, bzip2::Compression::default());
    let path = Path::new(&inputs[0]);
    let mut input_file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    std::io::copy(&mut input_file, &mut encoder).map_err(|e| e.to_string())?;
    encoder.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn compress_xz(inputs: Vec<String>, output: &Path) -> Result<(), String> {
    if inputs.len() > 1 {
        return Err("Multiple files require .tar.xz instead of .xz".to_string());
    }
    let file = std::fs::File::create(output).map_err(|e| e.to_string())?;
    let mut encoder = xz2::write::XzEncoder::new(file, 6);
    let path = Path::new(&inputs[0]);
    let mut input_file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    std::io::copy(&mut input_file, &mut encoder).map_err(|e| e.to_string())?;
    Ok(())
}

fn extract_dzip(archive_path: &Path, output_dir: &Path, password: Option<&str>) -> Result<(), String> {
    let file = std::fs::File::open(archive_path)
        .map_err(|e| format!("Failed to open archive: {}", e))?;
    let mut reader = std::io::BufReader::new(file);
    let mut archive = ArchiveReader::new(&mut reader, password)
        .map_err(|e| e.to_string())?;
    archive.extract_all(output_dir).map_err(|e| e.to_string())
}

fn extract_zip(archive_path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(archive_path)
        .map_err(|e| format!("Failed to open archive: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;
        if entry.is_dir() { continue; }
        let enclosed = match entry.enclosed_name() {
            Some(path) => path.to_owned(),
            None => continue, // Discard unsafe path traversing outside output_dir
        };
        let out_path = output_dir.join(enclosed);
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        let mut out_file = std::fs::File::create(&out_path)
            .map_err(|e| format!("Failed to create output file: {}", e))?;
        std::io::copy(&mut entry, &mut out_file)
            .map_err(|e| format!("Failed to extract file: {}", e))?;
    }
    Ok(())
}

fn extract_sevenz(archive_path: &Path, output_dir: &Path) -> Result<(), String> {
    let mut archive = sevenz_rust::SevenZReader::open(archive_path, sevenz_rust::Password::empty())
        .map_err(|e| format!("Failed to read 7z archive: {}", e))?;
    std::fs::create_dir_all(output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;
    archive.for_each_entries(|entry, reader| -> Result<bool, sevenz_rust::Error> {
        if entry.is_directory() { return Ok(true); }
        let safe_rel: PathBuf = Path::new(&entry.name)
            .components()
            .filter_map(|c| match c {
                std::path::Component::Normal(s) => Some(s),
                _ => None,
            })
            .collect();
        if safe_rel.as_os_str().is_empty() { return Ok(true); }
        let out_path = output_dir.join(&safe_rel);
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| sevenz_rust::Error::io(e))?;
        }
        let mut out_file = std::fs::File::create(&out_path)
            .map_err(|e| sevenz_rust::Error::io(e))?;
        std::io::copy(reader, &mut out_file)
            .map_err(|e| sevenz_rust::Error::io(e))?;
        Ok(true)
    }).map_err(|e| format!("Failed to extract 7z archive: {}", e))
}

fn extract_rar(archive_path: &Path, output_dir: &Path) -> Result<(), String> {
    let mut rar_archive = unrar::Archive::new(archive_path).open_for_processing()
        .map_err(|e| format!("Failed to open RAR archive: {}", e))?;
    loop {
        let Some(header) = rar_archive.read_header()
            .map_err(|e| format!("Failed to read RAR header: {}", e))?
        else { break };
        let entry = header.entry();
        if entry.is_directory() {
            rar_archive = header.skip()
                .map_err(|e| format!("Failed to skip RAR entry: {}", e))?;
            continue;
        }
        let rel_path = entry.filename.to_string_lossy().to_string();
        let safe_rel: PathBuf = Path::new(&rel_path)
            .components()
            .filter_map(|c| match c {
                std::path::Component::Normal(s) => Some(s),
                _ => None,
            })
            .collect();
        if safe_rel.as_os_str().is_empty() {
            rar_archive = header.skip()
                .map_err(|e| format!("Failed to skip RAR entry: {}", e))?;
            continue;
        }
        let out_path = output_dir.join(&safe_rel);
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        let (data, next) = header.read()
            .map_err(|e| format!("Failed to extract RAR entry: {}", e))?;
        std::fs::write(&out_path, &data)
            .map_err(|e| format!("Failed to write output file: {}", e))?;
        rar_archive = next;
    }
    Ok(())
}

fn extract_tar(path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    extract_tar_archive(file, output_dir)
}

fn extract_targz(path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let decoder = flate2::read::GzDecoder::new(file);
    extract_tar_archive(decoder, output_dir)
}

fn extract_tarbz2(path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let decoder = bzip2::read::BzDecoder::new(file);
    extract_tar_archive(decoder, output_dir)
}

fn extract_tarxz(path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let decoder = xz2::read::XzDecoder::new(file);
    extract_tar_archive(decoder, output_dir)
}

#[tauri::command]
async fn extract_archive(
    app_handle: AppHandle,
    archive_path: String,
    output_dir: String,
    options: ExtractionOptions,
) -> Result<(), String> {
    let _ = app_handle.emit("extract_progress", 0u32);
    let archive_path = PathBuf::from(&archive_path);
    let mut output_path = PathBuf::from(&output_dir);

    // Smart Unpack: If enabled and archive contains multiple root items, unpack into a dedicated subfolder
    if options.smart_unpack.unwrap_or(false) {
        if let Ok(entries) = list_archive(archive_path.to_string_lossy().to_string(), options.password.clone()).await {
            let mut roots = std::collections::HashSet::new();
            for entry in &entries {
                let p = entry.path.trim_start_matches('/');
                if let Some(first_seg) = p.split('/').next() {
                    if !first_seg.is_empty() {
                        roots.insert(first_seg.to_string());
                    }
                }
            }
            if roots.len() > 1 || (roots.len() == 1 && entries.iter().any(|e| !e.path.contains('/'))) {
                let stem = archive_path.file_stem().unwrap_or_default().to_string_lossy();
                let clean_stem = stem.trim_end_matches(".tar");
                if !clean_stem.is_empty() {
                    output_path = output_path.join(clean_stem);
                }
            }
        }
    }

    std::fs::create_dir_all(&output_path)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    let result = match detect_format(&archive_path) {
        "dzip" => extract_dzip(&archive_path, &output_path, options.password.as_deref()),
        "zip" => extract_zip(&archive_path, &output_path),
        "7z" => extract_sevenz(&archive_path, &output_path),
        "rar" => extract_rar(&archive_path, &output_path),
        "tar" => extract_tar(&archive_path, &output_path),
        "tar.gz" => extract_targz(&archive_path, &output_path),
        "tar.bz2" => extract_tarbz2(&archive_path, &output_path),
        "tar.xz" => extract_tarxz(&archive_path, &output_path),
        "gz" => extract_gz(&archive_path, &output_path),
        "bz2" => extract_bz2(&archive_path, &output_path),
        "xz" => extract_xz(&archive_path, &output_path),
        _ => extract_dzip(&archive_path, &output_path, options.password.as_deref()),
    };
    let _ = app_handle.emit("extract_progress", 100u32);
    result
}

#[tauri::command]
async fn compress_files(
    app_handle: AppHandle,
    inputs: Vec<String>,
    output: String,
    options: CompressionOptions,
) -> Result<(), String> {
    let output_path = PathBuf::from(output);
    let split_size = options.split_size;
    let res = match detect_output_format(&output_path) {
        "zip" => compress_zip(inputs, &output_path),
        "7z" => compress_sevenz(inputs, &output_path),
        "tar" => compress_tar(inputs, &output_path),
        "tar.gz" => compress_targz(inputs, &output_path),
        "tar.bz2" => compress_tarbz2(inputs, &output_path),
        "tar.xz" => compress_tarxz(inputs, &output_path),
        "gz" => compress_gz(inputs, &output_path),
        "bz2" => compress_bz2(inputs, &output_path),
        "xz" => compress_xz(inputs, &output_path),
        _ => compress_dzip(app_handle, inputs, &output_path, options).await,
    };
    if res.is_ok() {
        if let Some(bytes) = split_size {
            if bytes >= 1024 && output_path.exists() {
                let _ = dodazip::archive::split_archive_into_volumes(&output_path, bytes);
            }
        }
    }
    res
}

#[tauri::command]
async fn verify_archive(archive_path: String, password: Option<String>) -> Result<VerifyResult, String> {
    let path = PathBuf::from(&archive_path);
    if !path.exists() {
        return Ok(VerifyResult { valid: false, entries: 0, total_size: 0, error: Some("File not found".into()) });
    }
    match detect_format(&path) {
        "dzip" => {
            let file = std::fs::File::open(&path)
                .map_err(|e| format!("Failed to open: {}", e))?;
            let mut reader = std::io::BufReader::new(file);
            match ArchiveReader::new(&mut reader, password.as_deref()) {
                Ok(mut archive) => {
                    let entries = archive.entries().len();
                    let total_size: u64 = archive.entries().iter().map(|e| e.file_size).sum();
                    // Cryptographically test each entry against BLAKE3 hashes & ECC chunks
                    for i in 0..entries {
                        if let Err(e) = archive.read_file_by_index(i) {
                            return Ok(VerifyResult {
                                valid: false,
                                entries,
                                total_size,
                                error: Some(format!("Integrity check failed at file #{}: {}", i + 1, e)),
                            });
                        }
                    }
                    Ok(VerifyResult { valid: true, entries, total_size, error: None })
                }
                Err(e) => Ok(VerifyResult { valid: false, entries: 0, total_size: 0, error: Some(e.to_string()) })
            }
        }
        "zip" => {
            let file = match std::fs::File::open(&path) {
                Ok(f) => f,
                Err(e) => return Ok(VerifyResult { valid: false, entries: 0, total_size: 0, error: Some(e.to_string()) }),
            };
            match zip::ZipArchive::new(file) {
                Ok(mut archive) => {
                    let entries = archive.len();
                    let total_size: u64 = (0..entries).filter_map(|i| archive.by_index(i).ok().map(|e| e.size())).sum();
                    Ok(VerifyResult { valid: true, entries, total_size, error: None })
                }
                Err(e) => Ok(VerifyResult { valid: false, entries: 0, total_size: 0, error: Some(e.to_string()) })
            }
        }
        "7z" => {
            match sevenz_rust::SevenZReader::open(&path, sevenz_rust::Password::empty()) {
                Ok(archive) => {
                    let entries: Vec<_> = archive.archive().files.iter().filter(|f| !f.is_directory()).collect();
                    let total_size: u64 = entries.iter().map(|e| e.size).sum();
                    Ok(VerifyResult { valid: true, entries: entries.len(), total_size, error: None })
                }
                Err(e) => Ok(VerifyResult { valid: false, entries: 0, total_size: 0, error: Some(e.to_string()) })
            }
        }
        _ => {
            // For other formats, attempt to list entries as a basic verification
            match list_archive(archive_path, password).await {
                Ok(entries) => {
                    let total_size: u64 = entries.iter().map(|e| e.size).sum();
                    Ok(VerifyResult { valid: true, entries: entries.len(), total_size, error: None })
                }
                Err(e) => Ok(VerifyResult { valid: false, entries: 0, total_size: 0, error: Some(e) })
            }
        }
    }
}

#[tauri::command]
async fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename: {}", e))
}

#[tauri::command]
async fn convert_archive(
    app_handle: AppHandle,
    source: String,
    dest: String,
    password: Option<String>,
) -> Result<(), String> {
    let _ = app_handle.emit("compress_progress", 0u32);
    let _src_path = PathBuf::from(&source);
    let _dst_path = PathBuf::from(&dest);

    // Create temp directory for extraction
    let tmp_dir = std::env::temp_dir().join(format!("dzip_convert_{}", std::process::id()));
    if tmp_dir.exists() {
        std::fs::remove_dir_all(&tmp_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&tmp_dir).map_err(|e| e.to_string())?;

    // Extract source to temp directory
    let extract_opts = ExtractionOptions { password, smart_unpack: Some(false) };
    extract_archive(app_handle.clone(), source, tmp_dir.to_string_lossy().to_string(), extract_opts).await?;

    // Collect extracted files
    let mut inputs = Vec::new();
    for entry in std::fs::read_dir(&tmp_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        inputs.push(entry.path().to_string_lossy().to_string());
    }

    // Compress to destination format
    let compress_opts = CompressionOptions {
        codec: "zstd".into(),
        level: "balanced".into(),
        dedup: true,
        password: None,
        ecc_level: None,
        split_size: None,
    };
    compress_files(app_handle.clone(), inputs, dest, compress_opts).await?;

    // Cleanup temp directory
    let _ = std::fs::remove_dir_all(&tmp_dir);

    let _ = app_handle.emit("compress_progress", 100u32);
    Ok(())
}

#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        std::fs::remove_dir_all(&p).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        std::fs::remove_file(&p).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecureDeleteOptions {
    pub secure: bool,
}

#[tauri::command]
async fn delete_file_secure(path: String, options: SecureDeleteOptions) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        return Err("Secure delete is only supported for files, not directories".to_string());
    }
    if options.secure {
        secure_delete(&p).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(&p).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub hash: String,
    pub files: Vec<String>,
    pub size: u64,
}

#[tauri::command]
async fn find_duplicate_files(paths: Vec<String>) -> Result<Vec<DuplicateGroup>, String> {
    let mut hash_map: HashMap<String, Vec<(String, u64)>> = HashMap::new();

    for dir in &paths {
        let dir_path = PathBuf::from(dir);
        if !dir_path.is_dir() {
            continue;
        }
        for entry in walkdir::WalkDir::new(&dir_path).into_iter().filter_map(|e| e.ok()) {
            if !entry.file_type().is_file() {
                continue;
            }
            let file_path = entry.path().to_string_lossy().to_string();
            let file_size = entry.metadata().map_err(|e| e.to_string())?.len();
            if file_size == 0 {
                continue;
            }
            let mut file = std::fs::File::open(entry.path()).map_err(|e| e.to_string())?;
            let mut hasher = blake3::Hasher::new();
            let mut buf = [0u8; 65536];
            loop {
                let n = file.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            let hash = hasher.finalize().to_hex().to_string();
            hash_map.entry(hash).or_default().push((file_path, file_size));
        }
    }

    let duplicates: Vec<DuplicateGroup> = hash_map
        .into_iter()
        .filter(|(_, files)| files.len() > 1)
        .map(|(hash, files)| {
            let size = files[0].1;
            let paths: Vec<String> = files.into_iter().map(|(p, _)| p).collect();
            DuplicateGroup { hash, files: paths, size }
        })
        .collect();

    Ok(duplicates)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitOptions {
    pub max_bytes: u64,
}

#[tauri::command]
async fn split_archive(path: String, options: SplitOptions) -> Result<Vec<String>, String> {
    let archive_path = PathBuf::from(&path);
    let volumes = split_archive_into_volumes(&archive_path, options.max_bytes)
        .map_err(|e| e.to_string())?;
    Ok(volumes.into_iter().map(|p| p.to_string_lossy().to_string()).collect())
}

#[tauri::command]
fn get_launch_file() -> Option<String> {
    std::env::args().skip(1).find(|p| {
        !p.starts_with("--") && std::path::Path::new(p).exists()
    })
}

#[tauri::command]
fn get_launch_files() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|p| !p.starts_with("--"))
        .filter(|p| std::path::Path::new(p).exists())
        .collect()
}

#[cfg(windows)]
fn register_windows_association() {
    if let Ok(exe_path) = std::env::current_exe() {
        use std::os::windows::process::CommandExt;
        let exe_str = exe_path.to_string_lossy();
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\".into());
        let icon_dir = std::path::PathBuf::from(local_app_data).join("DodaZip");
        let _ = std::fs::create_dir_all(&icon_dir);
        let icon_path = icon_dir.join("dzip_file.ico");
        let _ = std::fs::write(&icon_path, include_bytes!("../icons/dzip_file.ico"));
        let icon_str = icon_path.to_string_lossy();

        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\.dzip", "/ve", "/d", "DodaZip.Vault", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\.dzip", "/v", "PerceivedType", "/d", "compressed", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault", "/ve", "/d", "DodaZip Vault Archive", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\DefaultIcon", "/ve", "/d", &format!("\"{}\"", icon_str), "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let cmd_str = format!("\"{}\" \"%1\"", exe_str);
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\open\\command", "/ve", "/d", &cmd_str, "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.dzip\\OpenWithProgids", "/v", "DodaZip.Vault", "/t", "REG_NONE", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.dzip\\UserChoice", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
    }
}

#[tauri::command]
async fn open_in_browser(url: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(&["/c", "start", "", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
async fn pick_archive_file(app: AppHandle, default_path: Option<String>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let mut builder = app.dialog().file()
        .add_filter("Supported Archives (*.zip, *.dzip, *.7z, *.rar, *.tar, *.gz, *.bz2, *.xz)", &["zip", "dzip", "7z", "rar", "tar", "gz", "bz2", "xz", "tgz", "tbz2", "txz"])
        .add_filter("All Files (*.*)", &["*"]);

    if let Some(dp) = default_path {
        builder = builder.set_directory(PathBuf::from(dp));
    }

    let file_opt = builder.blocking_pick_file();
    Ok(file_opt.map(|f| f.to_string()))
}

#[tauri::command]
async fn pick_folder_dialog(app: AppHandle, default_path: Option<String>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let mut builder = app.dialog().file();

    if let Some(dp) = default_path {
        builder = builder.set_directory(PathBuf::from(dp));
    }

    let folder_opt = builder.blocking_pick_folder();
    Ok(folder_opt.map(|f| f.to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            #[cfg(windows)]
            {
                register_windows_association();
            }
            #[cfg(desktop)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.center();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_directory,
            compress_files,
            list_archive,
            extract_archive,
            verify_archive,
            get_launch_file,
            get_launch_files,
            rename_file,
            convert_archive,
            delete_file,
            delete_file_secure,
            find_duplicate_files,
            split_archive,
            open_in_browser,
            pick_archive_file,
            pick_folder_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run()
}
