#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Read;
use std::path::{Path, PathBuf};

use std::collections::HashMap;

use dodazip::{
    ArchiveBuilder, ArchiveReader, Codec, CompressionLevel, EccLevel,
    secure_delete, split_archive_into_volumes, compress, decompress,
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
        e if e.eq_ignore_ascii_case("cab") => "cab",
        e if e.eq_ignore_ascii_case("deb") => "deb",
        e if e.eq_ignore_ascii_case("ar") => "ar",
        e if e.eq_ignore_ascii_case("a") => "ar",
        e if e.eq_ignore_ascii_case("iso") => "iso",
        e if e.eq_ignore_ascii_case("dmg") => "dmg",
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
    pub modified: Option<u64>,
    pub file_type: Option<String>,
    pub attributes: Option<String>,
}

#[cfg(windows)]
fn get_file_attributes_str(metadata: &std::fs::Metadata) -> String {
    use std::os::windows::fs::MetadataExt;
    let attr = metadata.file_attributes();
    let mut s = String::new();
    if metadata.is_dir() {
        s.push('D');
    }
    // FILE_ATTRIBUTE_READONLY = 0x00000001
    if (attr & 0x00000001) != 0 {
        s.push('R');
    }
    // FILE_ATTRIBUTE_HIDDEN = 0x00000002
    if (attr & 0x00000002) != 0 {
        s.push('H');
    }
    // FILE_ATTRIBUTE_SYSTEM = 0x00000004
    if (attr & 0x00000004) != 0 {
        s.push('S');
    }
    // FILE_ATTRIBUTE_ARCHIVE = 0x00000020
    if (attr & 0x00000020) != 0 {
        s.push('A');
    }
    if s.is_empty() {
        if metadata.is_file() { "A".to_string() } else { "".to_string() }
    } else {
        s
    }
}

#[cfg(not(windows))]
fn get_file_attributes_str(metadata: &std::fs::Metadata) -> String {
    if metadata.is_dir() { "D".to_string() } else { "A".to_string() }
}

fn get_file_type_str(name: &str, is_dir: bool) -> String {
    if is_dir {
        return "File folder".to_string();
    }
    let lower = name.to_lowercase();
    if lower.ends_with(".tar.gz") || lower.ends_with(".tgz") {
        return "GZIP Tarball Archive".to_string();
    }
    if lower.ends_with(".tar.bz2") || lower.ends_with(".tbz2") {
        return "BZIP2 Tarball Archive".to_string();
    }
    if lower.ends_with(".tar.xz") || lower.ends_with(".txz") {
        return "XZ Tarball Archive".to_string();
    }
    let ext = std::path::Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "dzip" => "DodaZip Secure Vault",
        "zip" => "ZIP Archive",
        "7z" => "7-Zip Archive",
        "rar" => "RAR Archive",
        "tar" => "TAR Archive",
        "gz" => "GZIP Compressed File",
        "bz2" => "BZIP2 Compressed File",
        "xz" => "XZ Compressed File",
        "iso" => "Disc Image (ISO)",
        "dmg" => "Apple Disk Image",
        "cab" => "Windows Cabinet File",
        "deb" => "Debian Linux Package",
        "rpm" => "Red Hat Package",
        "exe" => "Application",
        "msi" => "Windows Installer Package",
        "bat" | "cmd" => "Windows Command Script",
        "ps1" => "PowerShell Script",
        "sh" => "Shell Script",
        "jpg" | "jpeg" => "JPEG Image",
        "png" => "PNG Image",
        "gif" => "GIF Image",
        "bmp" => "Bitmap Image",
        "svg" => "SVG Vector Image",
        "webp" => "WebP Image",
        "ico" => "Icon File",
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "webm" => "Video File",
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" => "Audio File",
        "pdf" => "PDF Document",
        "doc" | "docx" => "Microsoft Word Document",
        "xls" | "xlsx" => "Microsoft Excel Worksheet",
        "ppt" | "pptx" => "Microsoft PowerPoint Presentation",
        "txt" => "Text Document",
        "md" => "Markdown Document",
        "json" => "JSON Document",
        "xml" => "XML Document",
        "csv" => "CSV Spreadsheet",
        "html" | "htm" => "HTML Document",
        "css" => "Cascading Style Sheet",
        "js" => "JavaScript File",
        "ts" | "tsx" => "TypeScript File",
        "rs" => "Rust Source File",
        "py" => "Python Source File",
        "c" | "cpp" | "h" | "hpp" => "C/C++ Source File",
        "java" => "Java Source File",
        "dll" => "Application Extension",
        "sys" => "System File",
        "log" => "Log File",
        "ini" | "cfg" | "conf" | "toml" | "yaml" | "yml" => "Configuration File",
        "" => "File",
        other => return format!("{} File", other.to_uppercase()),
    }.to_string()
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
            modified: None,
            file_type: Some("File folder".to_string()),
            attributes: Some("D".to_string()),
        });
    }

    let read_dir = std::fs::read_dir(&dir_path)
        .map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        let is_dir = metadata.is_dir();
        let modified = metadata.modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs());
        let file_type = Some(get_file_type_str(&file_name, is_dir));
        let attributes = Some(get_file_attributes_str(&metadata));
        
        entries.push(FileInfo {
            path: entry.path().to_string_lossy().to_string(),
            name: file_name,
            size: metadata.len(),
            is_dir,
            is_file: metadata.is_file(),
            modified,
            file_type,
            attributes,
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

fn sanitize_relative_path(p: &str) -> PathBuf {
    Path::new(p)
        .components()
        .filter_map(|c| match c {
            std::path::Component::Normal(s) => Some(s),
            _ => None,
        })
        .collect()
}

fn list_cab_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let cabinet = cab::Cabinet::new(file).map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for folder in cabinet.folder_entries() {
        for file in folder.file_entries() {
            entries.push(ArchiveEntry {
                path: file.name().replace('\\', "/"),
                size: file.uncompressed_size() as u64,
                chunks: 1,
            });
        }
    }
    Ok(entries)
}

fn extract_cab(path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut cabinet = cab::Cabinet::new(file).map_err(|e| e.to_string())?;
    let mut file_names = Vec::new();
    for folder in cabinet.folder_entries() {
        for file in folder.file_entries() {
            file_names.push(file.name().to_string());
        }
    }
    for file_name in file_names {
        let safe_rel = sanitize_relative_path(&file_name.replace('\\', "/"));
        if safe_rel.as_os_str().is_empty() {
            continue;
        }
        let target_path = output_dir.join(&safe_rel);
        if let Some(parent) = target_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut reader = cabinet.read_file(&file_name).map_err(|e| e.to_string())?;
        let mut writer = std::fs::File::create(&target_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut reader, &mut writer).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn list_ar_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = ar::Archive::new(file);
    let mut entries = Vec::new();
    while let Some(entry_result) = archive.next_entry() {
        let entry = entry_result.map_err(|e| e.to_string())?;
        let raw_name = String::from_utf8_lossy(entry.header().identifier());
        let name = raw_name.trim().trim_end_matches('/').to_string();
        if !name.is_empty() {
            entries.push(ArchiveEntry {
                path: name,
                size: entry.header().size(),
                chunks: 1,
            });
        }
    }
    Ok(entries)
}

fn extract_ar(path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = ar::Archive::new(file);
    while let Some(entry_result) = archive.next_entry() {
        let mut entry = entry_result.map_err(|e| e.to_string())?;
        let raw_name = String::from_utf8_lossy(entry.header().identifier());
        let name = raw_name.trim().trim_end_matches('/').to_string();
        if name.is_empty() {
            continue;
        }
        let safe_rel = sanitize_relative_path(&name);
        if safe_rel.as_os_str().is_empty() {
            continue;
        }
        let target_path = output_dir.join(&safe_rel);
        if let Some(parent) = target_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut writer = std::fs::File::create(&target_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut writer).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn walk_iso_dir<T: iso9660::ISO9660Reader>(
    dir: &iso9660::ISODirectory<T>,
    prefix: &str,
    entries: &mut Vec<ArchiveEntry>,
) -> Result<(), String> {
    for entry in dir.contents() {
        let entry = entry.map_err(|e| format!("{:?}", e))?;
        let name = entry.identifier();
        if name == "." || name == ".." {
            continue;
        }
        let full_path = if prefix.is_empty() {
            name.to_string()
        } else {
            format!("{}/{}", prefix, name)
        };
        match entry {
            iso9660::DirectoryEntry::Directory(sub_dir) => {
                walk_iso_dir(&sub_dir, &full_path, entries)?;
            }
            iso9660::DirectoryEntry::File(f) => {
                entries.push(ArchiveEntry {
                    path: full_path,
                    size: f.size() as u64,
                    chunks: 1,
                });
            }
        }
    }
    Ok(())
}

fn list_iso_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let iso = iso9660::ISO9660::new(file).map_err(|e| format!("{:?}", e))?;
    let mut entries = Vec::new();
    walk_iso_dir(&iso.root, "", &mut entries)?;
    Ok(entries)
}

fn extract_iso_dir<T: iso9660::ISO9660Reader>(
    dir: &iso9660::ISODirectory<T>,
    target_dir: &Path,
) -> Result<(), String> {
    for entry in dir.contents() {
        let entry = entry.map_err(|e| format!("{:?}", e))?;
        let name = entry.identifier();
        if name == "." || name == ".." {
            continue;
        }
        let safe_name = sanitize_relative_path(name);
        if safe_name.as_os_str().is_empty() {
            continue;
        }
        let target_path = target_dir.join(&safe_name);
        match entry {
            iso9660::DirectoryEntry::Directory(sub_dir) => {
                std::fs::create_dir_all(&target_path).map_err(|e| e.to_string())?;
                extract_iso_dir(&sub_dir, &target_path)?;
            }
            iso9660::DirectoryEntry::File(f) => {
                if let Some(parent) = target_path.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let mut reader = f.read();
                let mut writer = std::fs::File::create(&target_path).map_err(|e| e.to_string())?;
                std::io::copy(&mut reader, &mut writer).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

fn extract_iso(path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let iso = iso9660::ISO9660::new(file).map_err(|e| format!("{:?}", e))?;
    extract_iso_dir(&iso.root, output_dir)
}

fn list_dmg_entries(path: &Path) -> Result<Vec<ArchiveEntry>, String> {
    // Try opening filesystem first (standard macOS disk images with HFS+ or APFS)
    if let Ok(mut pipeline) = dpp::DmgPipeline::open(path) {
        if let Ok(mut fs) = pipeline.open_filesystem() {
            if let Ok(walk_entries) = fs.walk() {
                let mut entries = Vec::new();
                for entry in walk_entries {
                    if entry.entry.kind == dpp::FsEntryKind::File {
                        let clean_path = entry.path.trim_start_matches('/').to_string();
                        if !clean_path.is_empty() {
                            entries.push(ArchiveEntry {
                                path: clean_path,
                                size: entry.entry.size,
                                chunks: 1,
                            });
                        }
                    }
                }
                if !entries.is_empty() {
                    return Ok(entries);
                }
            }
        }
    }

    // Fallback: list raw partitions using udif
    let archive = udif::DmgArchive::open(path).map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for p in archive.partitions() {
        let name = if p.name.is_empty() {
            format!("partition_{}.img", p.id)
        } else {
            format!("{}.img", p.name.replace('/', "_"))
        };
        entries.push(ArchiveEntry {
            path: name,
            size: p.size,
            chunks: 1,
        });
    }
    Ok(entries)
}

fn extract_dmg(path: &Path, output_dir: &Path) -> Result<(), String> {
    // Try extracting filesystem files first
    if let Ok(mut pipeline) = dpp::DmgPipeline::open(path) {
        if let Ok(mut fs) = pipeline.open_filesystem() {
            let stats = fs.extract_all(output_dir).map_err(|e| e.to_string())?;
            if stats.files > 0 || stats.dirs > 0 {
                return Ok(());
            }
        }
    }

    // Fallback: extract partitions to output_dir
    let mut archive = udif::DmgArchive::open(path).map_err(|e| e.to_string())?;
    let partitions = archive.partitions();
    for p in partitions {
        let name = if p.name.is_empty() {
            format!("partition_{}.img", p.id)
        } else {
            format!("{}.img", p.name.replace('/', "_"))
        };
        let safe_name = sanitize_relative_path(&name);
        if safe_name.as_os_str().is_empty() {
            continue;
        }
        let target_path = output_dir.join(&safe_name);
        if let Some(parent) = target_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut file = std::fs::File::create(&target_path).map_err(|e| e.to_string())?;
        let _ = archive.extract_partition_to(p.id, &mut file);
    }
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
        "cab" => list_cab_entries(&path),
        "deb" | "ar" => list_ar_entries(&path),
        "iso" => list_iso_entries(&path),
        "dmg" => list_dmg_entries(&path),
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
        "cab" => extract_cab(&archive_path, &output_path),
        "deb" | "ar" => extract_ar(&archive_path, &output_path),
        "iso" => extract_iso(&archive_path, &output_path),
        "dmg" => extract_dmg(&archive_path, &output_path),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchAction {
    pub mode: String, // "normal" | "open" | "extract_here" | "extract_to" | "compress"
    pub files: Vec<String>,
    pub output_dir: Option<String>,
}

#[tauri::command]
fn get_launch_action() -> LaunchAction {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut files = Vec::new();
    let mut is_extract_here = false;
    let mut is_extract_to = false;

    for arg in &args {
        if arg == "--extract-here" {
            is_extract_here = true;
        } else if arg == "--extract-to" {
            is_extract_to = true;
        } else if !arg.starts_with("--") && std::path::Path::new(arg).exists() {
            files.push(arg.clone());
        }
    }

    if is_extract_here && !files.is_empty() {
        let target = Path::new(&files[0]);
        let parent = target.parent().unwrap_or(Path::new(".")).to_string_lossy().to_string();
        return LaunchAction {
            mode: "extract_here".to_string(),
            files,
            output_dir: Some(parent),
        };
    } else if is_extract_to && !files.is_empty() {
        let target = Path::new(&files[0]);
        let parent = target.parent().unwrap_or(Path::new("."));
        let stem = target.file_stem().unwrap_or_default().to_string_lossy().to_string();
        let clean_stem = stem.trim_end_matches(".tar");
        let dest = parent.join(clean_stem).to_string_lossy().to_string();
        return LaunchAction {
            mode: "extract_to".to_string(),
            files,
            output_dir: Some(dest),
        };
    } else if !files.is_empty() {
        let first = &files[0];
        let lower = first.to_lowercase();
        let is_arc = lower.ends_with(".dzip")
            || lower.ends_with(".zip")
            || lower.ends_with(".7z")
            || lower.ends_with(".rar")
            || lower.ends_with(".tar")
            || lower.ends_with(".tar.gz")
            || lower.ends_with(".tgz")
            || lower.ends_with(".tar.bz2")
            || lower.ends_with(".tbz2")
            || lower.ends_with(".tar.xz")
            || lower.ends_with(".txz")
            || lower.ends_with(".gz")
            || lower.ends_with(".bz2")
            || lower.ends_with(".xz")
            || lower.ends_with(".iso")
            || lower.ends_with(".dmg")
            || lower.ends_with(".cab")
            || lower.ends_with(".deb")
            || lower.ends_with(".ar");

        if files.len() == 1 && is_arc {
            return LaunchAction {
                mode: "open".to_string(),
                files,
                output_dir: None,
            };
        } else {
            return LaunchAction {
                mode: "compress".to_string(),
                files,
                output_dir: None,
            };
        }
    }

    LaunchAction {
        mode: "normal".to_string(),
        files: Vec::new(),
        output_dir: None,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub data_size_mb: usize,
    pub compress_speed_mbs: f64,
    pub decompress_speed_mbs: f64,
    pub compress_ratio: f64,
    pub hash_speed_mbs: f64,
    pub rating_score: u64,
}

fn get_cpu_info() -> (String, usize) {
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let output = std::process::Command::new("reg")
            .args(&[
                "query",
                "HKLM\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
                "/v",
                "ProcessorNameString",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                if line.contains("ProcessorNameString") {
                    if let Some(pos) = line.find("REG_SZ") {
                        let name = line[pos + 6..].trim().to_string();
                        if !name.is_empty() {
                            return (name, cores);
                        }
                    }
                }
            }
        }

        if let Ok(ident) = std::env::var("PROCESSOR_IDENTIFIER") {
            return (ident, cores);
        }
    }

    ("Host Processor".to_string(), cores)
}

fn generate_benchmark_data(size_bytes: usize) -> Vec<u8> {
    let mut result = Vec::with_capacity(size_bytes);
    let patterns: [&[u8]; 6] = [
        b"The quick brown fox jumps over the lazy dog 1234567890. ",
        b"DodaZip ultra-high performance compression engine with BLAKE3 and Zstandard. ",
        b"{\"status\":\"success\",\"code\":200,\"payload\":\"benchmark_data_payload_string\"}, ",
        b"<html><head><title>Benchmark Test</title></head><body><h1>DodaZip</h1></body></html>",
        b"0123456789ABCDEF\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F",
        b"Pack my box with five dozen liquor jugs! How vexingly quick daft zebras jump! ",
    ];

    let mut i = 0;
    while result.len() < size_bytes {
        let pattern = patterns[i % patterns.len()];
        let repeat = ((i * 13) % 7) + 2;
        for _ in 0..repeat {
            if result.len() + pattern.len() <= size_bytes {
                result.extend_from_slice(pattern);
            } else {
                let remaining = size_bytes - result.len();
                result.extend_from_slice(&pattern[..remaining]);
                break;
            }
        }
        i += 1;
    }
    result
}

#[tauri::command]
async fn run_benchmark(data_size_mb: Option<usize>) -> Result<BenchmarkResult, String> {
    use rayon::prelude::*;
    use std::time::Instant;

    let size_mb = data_size_mb.unwrap_or(32).clamp(8, 256);
    let size_bytes = size_mb * 1024 * 1024;
    let (cpu_brand, cpu_cores) = get_cpu_info();

    tokio::task::spawn_blocking(move || {
        let test_data = generate_benchmark_data(size_bytes);

        // 1. BLAKE3 Hashing Benchmark (chunked across cores)
        let hash_start = Instant::now();
        let chunk_size = 1024 * 1024;
        let hash_chunks: Vec<&[u8]> = test_data.chunks(chunk_size).collect();
        let _chunk_hashes: Vec<blake3::Hash> = hash_chunks
            .par_iter()
            .map(|chunk| blake3::hash(chunk))
            .collect();
        let hash_dur = hash_start.elapsed().as_secs_f64().max(0.0001);
        let hash_speed_mbs = (size_mb as f64) / hash_dur;

        // 2. Multi-threaded Zstd Compression Benchmark (Balanced Level)
        let comp_start = Instant::now();
        let comp_chunks: Vec<Vec<u8>> = hash_chunks
            .par_iter()
            .map(|chunk| {
                compress(chunk, Codec::Zstd, CompressionLevel::Balanced)
                    .unwrap_or_else(|_| chunk.to_vec())
            })
            .collect();
        let comp_dur = comp_start.elapsed().as_secs_f64().max(0.0001);
        let compress_speed_mbs = (size_mb as f64) / comp_dur;

        let total_comp_bytes: usize = comp_chunks.iter().map(|c| c.len()).sum();
        let compress_ratio = if total_comp_bytes > 0 {
            (size_bytes as f64) / (total_comp_bytes as f64)
        } else {
            1.0
        };

        // 3. Multi-threaded Zstd Decompression Benchmark
        let decomp_start = Instant::now();
        let _decomp_chunks: Vec<Vec<u8>> = comp_chunks
            .par_iter()
            .zip(&hash_chunks)
            .map(|(comp, orig)| {
                decompress(comp, orig.len(), Codec::Zstd)
                    .unwrap_or_else(|_| comp.clone())
            })
            .collect();
        let decomp_dur = decomp_start.elapsed().as_secs_f64().max(0.0001);
        let decompress_speed_mbs = (size_mb as f64) / decomp_dur;

        // Combined score
        let rating_score = ((compress_speed_mbs * 15.0) + (decompress_speed_mbs * 8.0) + (hash_speed_mbs * 2.0)) as u64;

        BenchmarkResult {
            cpu_brand,
            cpu_cores,
            data_size_mb: size_mb,
            compress_speed_mbs: (compress_speed_mbs * 10.0).round() / 10.0,
            decompress_speed_mbs: (decompress_speed_mbs * 10.0).round() / 10.0,
            compress_ratio: (compress_ratio * 100.0).round() / 100.0,
            hash_speed_mbs: (hash_speed_mbs * 10.0).round() / 10.0,
            rating_score,
        }
    })
    .await
    .map_err(|e| e.to_string())
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
        let dzip_icon_path = icon_dir.join("dzip_file.ico");
        let _ = std::fs::write(&dzip_icon_path, include_bytes!("../icons/dzip_file.ico"));
        let dzip_icon_str = dzip_icon_path.to_string_lossy();

        let app_icon_path = icon_dir.join("icon.ico");
        let _ = std::fs::write(&app_icon_path, include_bytes!("../icons/icon.ico"));
        let app_icon_str = app_icon_path.to_string_lossy();

        let open_cmd = format!("\"{}\" \"%1\"", exe_str);
        let extract_here_cmd = format!("\"{}\" --extract-here \"%1\"", exe_str);
        let extract_to_cmd = format!("\"{}\" --extract-to \"%1\"", exe_str);

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
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\DefaultIcon", "/ve", "/d", &format!("\"{}\"", dzip_icon_str), "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\open", "/ve", "/d", "Open in DodaZip", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\open\\command", "/ve", "/d", &open_cmd, "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\extract_here", "/ve", "/d", "Extract Here", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\extract_here", "/v", "Icon", "/d", &format!("\"{}\"", app_icon_str), "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\extract_here\\command", "/ve", "/d", &extract_here_cmd, "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\extract_to", "/ve", "/d", "Extract to subfolder", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\extract_to", "/v", "Icon", "/d", &format!("\"{}\"", app_icon_str), "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        let _ = std::process::Command::new("reg")
            .args(&["add", "HKCU\\Software\\Classes\\DodaZip.Vault\\shell\\extract_to\\command", "/ve", "/d", &extract_to_cmd, "/f"])
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

        // Register Windows Explorer SystemFileAssociations for all archive types
        for &ext in SUPPORTED_ASSOCIATIONS {
            let sfa = format!("HKCU\\Software\\Classes\\SystemFileAssociations\\.{}\\shell", ext);

            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.Open", sfa), "/ve", "/d", "Open in DodaZip", "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.Open", sfa), "/v", "Icon", "/d", &format!("\"{}\"", app_icon_str), "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.Open\\command", sfa), "/ve", "/d", &open_cmd, "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();

            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.ExtractHere", sfa), "/ve", "/d", "Extract Here", "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.ExtractHere", sfa), "/v", "Icon", "/d", &format!("\"{}\"", app_icon_str), "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.ExtractHere\\command", sfa), "/ve", "/d", &extract_here_cmd, "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();

            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.ExtractTo", sfa), "/ve", "/d", "Extract to subfolder", "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.ExtractTo", sfa), "/v", "Icon", "/d", &format!("\"{}\"", app_icon_str), "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\DodaZip.ExtractTo\\command", sfa), "/ve", "/d", &extract_to_cmd, "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
        }

        // Add to Archive context menu on files and folders
        for &base in &["HKCU\\Software\\Classes\\*\\shell\\DodaZipCompress", "HKCU\\Software\\Classes\\Directory\\shell\\DodaZipCompress"] {
            let _ = std::process::Command::new("reg")
                .args(&["add", base, "/ve", "/d", "Add to Archive with DodaZip", "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            let _ = std::process::Command::new("reg")
                .args(&["add", base, "/v", "Icon", "/d", &format!("\"{}\"", app_icon_str), "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            let _ = std::process::Command::new("reg")
                .args(&["add", &format!("{}\\command", base), "/ve", "/d", &open_cmd, "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
        }
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
        .add_filter(
            "Supported Archives (*.zip, *.dzip, *.7z, *.rar, *.tar, *.gz, *.bz2, *.xz, *.cab, *.deb, *.ar, *.iso, *.dmg)",
            &["zip", "dzip", "7z", "rar", "tar", "gz", "bz2", "xz", "tgz", "tbz2", "txz", "cab", "deb", "ar", "iso", "dmg"]
        )
        .add_filter("All Files (*.*)", &["*"]);

    if let Some(dp) = default_path {
        builder = builder.set_directory(PathBuf::from(dp));
    }

    let file_opt = builder.blocking_pick_file();
    Ok(file_opt.map(|f| f.to_string()))
}

const SUPPORTED_ASSOCIATIONS: &[&str] = &[
    "dzip", "zip", "7z", "rar", "tar", "iso", "cab", "deb", "dmg", "gz", "bz2", "xz"
];

#[tauri::command]
async fn get_file_associations() -> Result<HashMap<String, bool>, String> {
    let mut map = HashMap::new();
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        for &ext in SUPPORTED_ASSOCIATIONS {
            let mut associated = false;
            let output = std::process::Command::new("reg")
                .args(&["query", &format!("HKCU\\Software\\Classes\\.{}", ext), "/ve"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
            if let Ok(out) = output {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if stdout.contains("DodaZip") {
                    associated = true;
                }
            }
            if !associated {
                let ow_output = std::process::Command::new("reg")
                    .args(&["query", &format!("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.{}\\OpenWithProgids", ext)])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
                if let Ok(out) = ow_output {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    if stdout.contains("DodaZip") {
                        associated = true;
                    }
                }
            }
            if ext == "dzip" && !associated {
                associated = true;
            }
            map.insert(ext.to_string(), associated);
        }
    }
    #[cfg(not(windows))]
    {
        for &ext in SUPPORTED_ASSOCIATIONS {
            map.insert(ext.to_string(), ext == "dzip" || ext == "zip");
        }
    }
    Ok(map)
}

#[tauri::command]
async fn set_file_associations(associations: HashMap<String, bool>) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = exe_path.to_string_lossy().to_string();

        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\".into());
        let icon_dir = std::path::PathBuf::from(local_app_data).join("DodaZip");
        let _ = std::fs::create_dir_all(&icon_dir);
        let dzip_icon_path = icon_dir.join("dzip_file.ico");
        let _ = std::fs::write(&dzip_icon_path, include_bytes!("../icons/dzip_file.ico"));
        let dzip_icon_str = dzip_icon_path.to_string_lossy().to_string();

        for (ext, enabled) in associations {
            let prog_id = if ext == "dzip" {
                "DodaZip.Vault".to_string()
            } else {
                format!("DodaZip.{}", ext)
            };

            if enabled {
                let friendly_name = if ext == "dzip" {
                    "DodaZip Secure Vault Archive".to_string()
                } else {
                    format!("DodaZip Archive (.{})", ext)
                };
                let icon_str = if ext == "dzip" {
                    format!("\"{}\"", dzip_icon_str)
                } else {
                    format!("\"{}\",0", exe_str)
                };
                let cmd_str = format!("\"{}\" \"%1\"", exe_str);
                let extract_here_cmd = format!("\"{}\" --extract-here \"%1\"", exe_str);
                let extract_to_cmd = format!("\"{}\" --extract-to \"%1\"", exe_str);

                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\.{}", ext), "/ve", "/d", &prog_id, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\.{}", ext), "/v", "PerceivedType", "/d", "compressed", "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}", prog_id), "/ve", "/d", &friendly_name, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\DefaultIcon", prog_id), "/ve", "/d", &icon_str, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();

                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\shell\\open", prog_id), "/ve", "/d", "Open in DodaZip", "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\shell\\open\\command", prog_id), "/ve", "/d", &cmd_str, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();

                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\shell\\extract_here", prog_id), "/ve", "/d", "Extract Here", "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\shell\\extract_here", prog_id), "/v", "Icon", "/d", &icon_str, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\shell\\extract_here\\command", prog_id), "/ve", "/d", &extract_here_cmd, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();

                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\shell\\extract_to", prog_id), "/ve", "/d", "Extract to subfolder", "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\shell\\extract_to", prog_id), "/v", "Icon", "/d", &icon_str, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Classes\\{}\\shell\\extract_to\\command", prog_id), "/ve", "/d", &extract_to_cmd, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();

                let _ = std::process::Command::new("reg")
                    .args(&["add", &format!("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.{}\\OpenWithProgids", ext), "/v", &prog_id, "/t", "REG_NONE", "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
            } else {
                let output = std::process::Command::new("reg")
                    .args(&["query", &format!("HKCU\\Software\\Classes\\.{}", ext), "/ve"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
                if let Ok(out) = output {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    if stdout.contains("DodaZip") {
                        let _ = std::process::Command::new("reg")
                            .args(&["delete", &format!("HKCU\\Software\\Classes\\.{}", ext), "/ve", "/f"])
                            .creation_flags(CREATE_NO_WINDOW)
                            .status();
                    }
                }
                let _ = std::process::Command::new("reg")
                    .args(&["delete", &format!("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.{}\\OpenWithProgids", ext), "/v", &prog_id, "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
                let _ = std::process::Command::new("reg")
                    .args(&["delete", &format!("HKCU\\Software\\Classes\\{}", prog_id), "/f"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
            }
        }
        let _ = std::process::Command::new("ie4uinit.exe")
            .arg("-show")
            .creation_flags(CREATE_NO_WINDOW)
            .status();
    }
    Ok(())
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
            get_launch_action,
            run_benchmark,
            rename_file,
            convert_archive,
            delete_file,
            delete_file_secure,
            find_duplicate_files,
            split_archive,
            open_in_browser,
            pick_archive_file,
            pick_folder_dialog,
            get_file_associations,
            set_file_associations,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_detection() {
        assert_eq!(detect_format(Path::new("file.cab")), "cab");
        assert_eq!(detect_format(Path::new("package.deb")), "deb");
        assert_eq!(detect_format(Path::new("lib.a")), "ar");
        assert_eq!(detect_format(Path::new("archive.ar")), "ar");
        assert_eq!(detect_format(Path::new("image.iso")), "iso");
        assert_eq!(detect_format(Path::new("installer.dmg")), "dmg");
    }

    #[test]
    fn test_ar_roundtrip() {
        let temp_dir = std::env::temp_dir().join("dodazip_test_ar");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let ar_path = temp_dir.join("test.ar");
        let out_dir = temp_dir.join("extracted");

        let file = std::fs::File::create(&ar_path).unwrap();
        let mut builder = ar::Builder::new(file);
        let data = b"Hello from DodaZip AR/DEB test!";
        let mut header = ar::Header::new(b"sample.txt".to_vec(), data.len() as u64);
        header.set_mode(0o644);
        builder.append(&header, &data[..]).unwrap();
        drop(builder);

        let entries = list_ar_entries(&ar_path).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].path, "sample.txt");
        assert_eq!(entries[0].size, data.len() as u64);

        extract_ar(&ar_path, &out_dir).unwrap();
        let extracted_content = std::fs::read(out_dir.join("sample.txt")).unwrap();
        assert_eq!(extracted_content, data);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_cab_roundtrip() {
        let temp_dir = std::env::temp_dir().join("dodazip_test_cab");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let src_file = temp_dir.join("test.txt");
        std::fs::write(&src_file, b"DodaZip CAB format test content").unwrap();

        let cab_path = temp_dir.join("test.cab");
        let out_dir = temp_dir.join("extracted");

        let mut builder = cab::CabinetBuilder::new();
        let folder = builder.add_folder(cab::CompressionType::MsZip);
        folder.add_file("test.txt");
        let file = std::fs::File::create(&cab_path).unwrap();
        let mut cabinet = builder.build(file).unwrap();
        while let Some(mut writer) = cabinet.next_file().unwrap() {
            let mut f = std::fs::File::open(&src_file).unwrap();
            std::io::copy(&mut f, &mut writer).unwrap();
        }
        cabinet.finish().unwrap();

        let entries = list_cab_entries(&cab_path).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].path, "test.txt");

        extract_cab(&cab_path, &out_dir).unwrap();
        let content = std::fs::read(out_dir.join("test.txt")).unwrap();
        assert_eq!(content, b"DodaZip CAB format test content");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_iso_listing_and_extraction() {
        let iso_fixture = Path::new("C:/Users/admin/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/iso9660-0.1.1/test.iso");
        if !iso_fixture.exists() {
            return;
        }

        let temp_dir = std::env::temp_dir().join("dodazip_test_iso");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let entries = list_iso_entries(iso_fixture).unwrap();
        assert!(!entries.is_empty());
        assert!(entries.iter().any(|e| e.path.contains("GPL_3_0.TXT")));

        let out_dir = temp_dir.join("extracted");
        extract_iso(iso_fixture, &out_dir).unwrap();
        assert!(out_dir.join("GPL_3_0.TXT").exists());

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_dmg_roundtrip() {
        let temp_dir = std::env::temp_dir().join("dodazip_test_dmg");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let dmg_path = temp_dir.join("test.dmg");
        let out_dir = temp_dir.join("extracted");

        let partition_data = vec![0x42u8; 4096];
        udif::DmgBuilder::new()
            .compression(udif::CompressionMethod::Raw)
            .add_partition("Apple_HFS", partition_data.clone())
            .build(&dmg_path)
            .unwrap();

        let entries = list_dmg_entries(&dmg_path).unwrap();
        assert!(!entries.is_empty());

        extract_dmg(&dmg_path, &out_dir).unwrap();

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}

