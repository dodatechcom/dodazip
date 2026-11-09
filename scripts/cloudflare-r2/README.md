# Cloudflare R2 Multi-Platform Software Distribution

## Domain: `updates.dodatech.com`
## Bucket: `dodatech-updates`

### Recommended Folder Layout

```
dodatech-updates/
├── dodazip/
│   ├── latest.json
│   └── releases/
│       ├── windows/
│       │   ├── DodaZip-Setup-v0.1.0.exe
│       │   └── DodaZip-v0.1.0-windows-x64-portable.zip
│       ├── linux/
│       │   ├── dodazip-0.1.0-x86_64.AppImage
│       │   ├── dodazip_0.1.0_amd64.deb
│       │   └── dodazip-0.1.0-linux-x64.tar.gz
│       └── macos/
│           └── DodaZip-v0.1.0.dmg
└── durga-av/
    ├── latest.json
    └── releases/
        ├── windows/
        └── linux/
```

### Why Platform Subfolders Are Superior:
1. **Clean Separation**: Cross-platform releases produce 4–8 binaries per version. Having dedicated folders (`windows/`, `linux/`, `macos/`) prevents a disorganized root directory.
2. **Automated CI/CD Workflows**: Windows, Ubuntu, and macOS runners can independently upload artifacts to their respective folders without risk of naming conflicts.
3. **Smart Client Resolution**: DodaZip automatically detects the client OS (`windows`, `linux`, or `macos`) and downloads the exact installer matching the user's operating system.
