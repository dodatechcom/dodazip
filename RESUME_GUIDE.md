# DodaZip — Windows Setup & Resume Guide

This guide contains everything you need to safely back up this project, install Windows, set up your development environment, and resume development smoothly without running into disk-space or configuration issues.

---

## 1. Pre-Backup Checklist (Before Wiping Current Machine)

> [!IMPORTANT]
> **Do NOT copy `target/` or `node_modules/` into your backup.**
> Intermediate compilation files and packages take over **12+ GB** and contain hundreds of thousands of small files that will make your backup/transfer slow. The source code itself is only **~2.5 MB**.

Run the cleanup script to strip build artifacts before copying to an external drive or cloud:

```bash
cd /home/admin1/projects/dodazip
./scripts/clean.sh --deep
```

### What to back up:
- The entire `dodazip/` folder (with `target/` and `node_modules/` excluded/cleaned).
- Any custom notes or scripts you created outside the project folder.
- Your Git configuration / SSH keys (e.g., `~/.ssh` or Git credentials if needed).

---

## 2. Fresh Windows Setup Checklist

Once Windows 11/10 is installed, open **PowerShell as Administrator** or Windows Terminal, and install the required tools using `winget`:

### Step 1: Install Git & Node.js
```powershell
winget install --id Git.Git -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

### Step 2: Install Visual Studio 2022 C++ Build Tools (Required for Rust MSVC)
Rust on Windows targets MSVC (`x86_64-pc-windows-msvc`) and requires the MSVC C++ compiler and Windows SDK:
```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --config vsbuildtools.json --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```
*Alternatively, download the installer from [Visual Studio Downloads](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and check **"Desktop development with C++"**.*

### Step 3: Install Rust (`rustup`)
```powershell
winget install --id Rustlang.Rustup -e --source winget
```
After installation, open a new terminal and verify the default toolchain is MSVC:
```powershell
rustup default stable-x86_64-pc-windows-msvc
rustc --version
cargo --version
```

### Step 4: Install Useful Rust Tools (Optional & Recommended)
```powershell
# Tauri v2 CLI (for desktop app builds)
cargo install tauri-cli --version "^2.0"

# Cargo Sweep (for automatically keeping target folder size low)
cargo install cargo-sweep
```

*(Note: Windows 10/11 already has Microsoft Edge WebView2 runtime pre-installed, so no separate WebView2 install is required).*

---

## 3. Restoring & Building on Windows

Move the project folder into your Windows directory (e.g., `C:\Projects\dodazip` or `D:\dodazip`).

Open **PowerShell** or Command Prompt inside the `dodazip` directory:

### Step 1: Install Frontend Dependencies
```powershell
cd ui
npm install
npm run build
cd ..
```

### Step 2: Build the Core CLI
```powershell
# Build optimized release binary
cargo build --release

# The compiled executable will be at:
# .\target\release\dodazip.exe
```

Test the binary:
```powershell
.\target\release\dodazip.exe --help
```

### Step 3: Run the Desktop GUI in Development Mode
```powershell
npm --prefix ui run dev
# In another terminal (or using Tauri CLI):
cargo tauri dev
# Or simply:
npm run tauri dev
```

### Step 4: Build the Production Windows Installer (.msi / .exe)
```powershell
cd ui
npm run build
cd ..
cargo tauri build
```
The production installer and standalone app will be output to:
`.\target\release\bundle\msi\` and `.\target\release\bundle\nsis\`.

---

## 4. Managing Build Disk Space on Windows

The repository is now structured as a **unified Cargo workspace**:
- Both the CLI (`dodazip`) and GUI backend (`dodazip-ui`) share a single compilation target folder (`.\target\`).
- Compiler profiles are tuned:
  - `[profile.dev]`: Line-table debug info only (`debug = 1`) and `split-debuginfo = "unpacked"` to keep development builds light.
  - `[profile.release]`: `strip = true` automatically strips symbol tables for small production binaries (~15–25 MB).

### Cleanup Commands on Windows:
```powershell
# Standard clean (removes target/ and dist/):
.\scripts\clean.ps1
# or
npm run clean

# Stale-cache sweep (keeps active binary, removes old intermediate caches):
.\scripts\clean.ps1 -Sweep
# or
cargo sweep --installed

# Deep clean (cleans target/, dist/, and node_modules):
.\scripts\clean.ps1 -Deep
```

---

## 5. Windows Shell Context Menu Integration

DodaZip includes ready-to-use registry configuration for native Windows Explorer right-click integration:

1. Build or install `dodazip.exe` and `dodazip-ui.exe` to `C:\Program Files\DodaZIP\` (or adjust the path in `scripts\install-context-menu.reg`).
2. Run in an Administrator prompt:
   ```cmd
   regedit /s scripts\install-context-menu.reg
   ```
3. To remove:
   ```cmd
   regedit /s scripts\uninstall-context-menu.reg
   ```

Features enabled in Windows Explorer:
- Right-click `.dzip` files: "Extract Here (Smart Unpack)", "Extract to folder", "Inspect & Extract with DodaZIP...", "Verify Integrity".
- Right-click any file / folder: "⚡ Add to archive (Extreme)" cascading menu.

---

## 6. Architecture & Where We Left Off

### Current Repository Layout
```
dodazip/
├── Cargo.toml                  # Workspace root (CLI + GUI profiles & workspace definition)
├── Cargo.lock                  # Pinned dependencies
├── README.md                   # Full product overview & documentation
├── RESUME_GUIDE.md             # This Windows setup and onboarding guide
├── package.json                # Root package scripts (dev, build, tauri, clean)
│
├── src/                        # Core Rust library & CLI (dodazip crate)
│   ├── main.rs                 # CLI binary entry point
│   ├── lib.rs                  # Library entry point
│   ├── archive.rs              # Archive builder & reader (.dzip)
│   ├── chunk.rs                # FastCDC chunking, Zstd/LZMA2/LZ4 compression, BLAKE3
│   ├── crypto.rs               # XChaCha20-Poly1305 + Argon2id
│   ├── ecc.rs                  # Reed-Solomon erasure coding (self-healing)
│   ├── format.rs               # Binary format header definitions
│   └── fuse.rs                 # FUSE mount (Linux-specific)
│
├── src-tauri/                  # Desktop GUI backend (dodazip-ui crate)
│   ├── Cargo.toml              # Tauri dependencies (inherits root workspace)
│   ├── tauri.conf.json         # Tauri v2 configuration (windows, permissions, bundles)
│   └── src/
│       └── main.rs             # Tauri commands (compress, extract, verify, convert)
│
├── ui/                         # React + TypeScript + Vite frontend
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── pages/              # Home (file manager), CompressView, ExtractView
│       ├── components/         # Toolbar, ProgressBar, Message, ContextMenu, Icons
│       └── utils/              # tauriBridge.ts, helpers.ts, preferences.ts
│
└── scripts/
    ├── clean.sh                # Linux cleanup utility (standard, --sweep, --deep)
    ├── clean.ps1               # Windows PowerShell cleanup utility (standard, -Sweep, -Deep)
    ├── build-tauri.sh          # Linux rootless build helper
    ├── setup-deps.sh           # Linux rootless dependencies downloader
    ├── install-context-menu.reg   # Windows registry shell integration
    └── uninstall-context-menu.reg # Windows registry shell uninstaller
```

### Current Status (v0.5.1)
- **Format:** Native `.dzip` format with adaptive chunk windows (up to 4MB) and LZMA2 Extreme preset.
- **Foreign Formats:** Read and write support for 14 archive formats (`.zip`, `.7z`, `.tar`, `.tar.gz`, `.tar.bz2`, `.tar.xz`, `.gz`, `.bz2`, `.xz`, read-only for `.rar`).
- **Features Active:**
  - Real progress events for `.dzip` compression/decompression.
  - Smart Unpack (isolates multi-file archives into dedicated folders).
  - Security Risk Shield (scans for suspicious executable extensions).
  - Self-Healing ECC (Reed-Solomon shards).
  - Format converter & integrity checker.
- **Open-Source Strategy:** Free & open source under MIT / Apache-2.0. Optional monetization via Microsoft Store convenience packaging ($4.99–$9.99).

### Next Tasks to Resume
1. **Drag-and-Drop to Desktop:** Implement drag-out from the DodaZip file browser onto Windows Explorer or Desktop.
2. **Multi-Tab File Browser:** Allow multiple folder tabs in the file explorer UI.
3. **Windows Installer Polishing:** Configure NSIS / MSI branding and custom icons in `src-tauri/tauri.conf.json`.
