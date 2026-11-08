use std::fs::File;
use std::io::Write;
use std::path::Path;

fn create_png(width: u32, height: u32, path: &Path) -> std::io::Result<()> {
    let mut file = File::create(path)?;
    
    let signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    
    fn chunk(ctype: &[u8; 4], data: &[u8]) -> Vec<u8> {
        let mut result = Vec::new();
        result.extend_from_slice(&(data.len() as u32).to_be_bytes());
        result.extend_from_slice(ctype);
        result.extend_from_slice(data);
        
        let mut hasher = crc32fast::Hasher::new();
        hasher.update(ctype);
        hasher.update(data);
        result.extend_from_slice(&hasher.finalize().to_be_bytes());
        
        result
    }
    
    let mut ihdr_data = Vec::new();
    ihdr_data.extend_from_slice(&width.to_be_bytes());
    ihdr_data.extend_from_slice(&height.to_be_bytes());
    ihdr_data.push(8);
    ihdr_data.push(2);
    ihdr_data.push(0);
    ihdr_data.push(0);
    ihdr_data.push(0);
    
    let mut raw_data = Vec::new();
    for y in 0..height {
        raw_data.push(0);
        for x in 0..width {
            let gradient = ((x as f32 / width as f32) * 255.0) as u8;
            let gradient2 = ((y as f32 / height as f32) * 255.0) as u8;
            raw_data.push(100);
            raw_data.push(gradient2);
            raw_data.push(gradient);
        }
    }
    
    use deflate::{deflate_bytes, Compression};
    let compressed = deflate_bytes(&raw_data, Compression::Default);
    
    file.write_all(&signature)?;
    file.write_all(&chunk(b"IHDR", &ihdr_data))?;
    file.write_all(&chunk(b"IDAT", &compressed))?;
    file.write_all(&chunk(b"IEND", &[]))?;
    
    Ok(())
}

fn main() {
    let sizes = [32, 128];
    
    for &size in &sizes {
        let path_str = format!("/home/admin1/projects/dodazip/src-tauri/icons/{}x{}.png", size, size);
        let path = Path::new(&path_str);
        create_png(size, size, path).unwrap();
        println!("Created: {}", path_str);
    }
    
    let icns_data = include_bytes!("placeholder.icns");
    if icns_data.len() > 10 {
        let _ = std::fs::write("/home/admin1/projects/dodazip/src-tauri/icons/icon.icns", icns_data);
    }
    
    let ico_data = include_bytes!("placeholder.ico");
    if ico_data.len() > 10 {
        let _ = std::fs::write("/home/admin1/projects/dodazip/src-tauri/icons/icon.ico", ico_data);
    }
}
