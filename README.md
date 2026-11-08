# DodaZip

Cross-platform compression tool — native `.dzip` format with modern encryption & ECC, plus read/write for 14 foreign archive formats.

## Project Status

🚧 **Active Development** — v0.4.0 — Real progress events, archive integrity verification, format conversion, inline rename, delete, and colorized forms. Full GUI with dark mode, keyboard shortcuts, sortable columns, breadcrumb nav, right-click context menu, and 14 archive formats.

### Foreign Format Support

| Format | Read | Write |
|--------|------|-------|
| `.dzip` (native) | ✅ | ✅ |
| `.zip` | ✅ | ✅ |
| `.7z` | ✅ | ✅ |
| `.rar` | ✅ | ❌ (proprietary) |
| `.tar` | ✅ | ✅ |
| `.tar.gz` / `.tgz` | ✅ | ✅ |
| `.tar.bz2` / `.tbz2` | ✅ | ✅ |
| `.tar.xz` / `.txz` | ✅ | ✅ |
| `.gz` | ✅ | ✅* |
| `.bz2` | ✅ | ✅* |
| `.xz` | ✅ | ✅* |

\* Single-file only; use `.tar.gz`/`.tar.bz2`/`.tar.xz` for multiple inputs.
Native archive format is `.dzip` with ultra-high compression, deduplication, and self-healing ECC.

### Compression Engine
- **Codecs**: Zstandard, LZMA2 (7-Zip/xz), LZ4, and Store (no compression)
- **Deduplication**: Content-defined chunking (FastCDC) for cross-file dedup
- **Levels**: Fast, Balanced, Maximum compression profiles
- **Encryption**: XChaCha20-Poly1305 AEAD with Argon2id key derivation (GPU-resistant)
- **Self-Healing ECC**: Reed-Solomon erasure coding integrated into archive format
- **Random-Access Index**: Chunk table for O(1) single-file extraction
- **FUSE Mount**: Browse archives as read-only filesystems (optional feature)

### GUI Features (Tauri v2)

**File Browser**
- Directory navigation with Up button, breadcrumb path segments (clickable), and Enter-to-navigate
- Sticky table headers, sortable columns (click Name / Size to toggle asc/desc)
- Quick filter search bar with live client-side file filtering
- Right-click context menu: Add to Archive, Extract Here, Verify Integrity, Convert Format, Rename, Delete, Properties
- Keyboard shortcuts: `Ctrl+N` (new archive), `Ctrl+O` (refresh), `Ctrl+A` (select all), `F5` (refresh), `Escape` (clear filter/deselect), `Enter` (open archive or compress)
- Multi-file selection: Shift+Click range, Ctrl/Cmd+Click toggle, single-click clear+select
- Estimated total size for selected files in the status bar

**Compression Panel**
- Hero format selector cards: **.dzip** (Self-healing vault), **.zip** (Universal), **.7z** (High ratio)
- Volume splitting presets: Discord (25 MB), Email (20 MB), FAT32 (4 GB)
- Simplified compression: segmented button group (Fastest / Normal / Maximum / Store) with per-button accent colors
- Password protection with XChaCha20-Poly1305 encryption toggle
- ECC (Reed-Solomon) recovery data with Standard/Enhanced/Armored levels
- Animated progress bar with real progress events

**Extraction Panel**
- Smart Unpack: automatically organizes multi-file archives into dedicated folders to prevent zip bombs
- Security Risk Shield: flags executable and script files (.exe, .bat, .ps1, .scr, double extensions)
- Archive contents preview with file list and sizes

**Extraction Panel**
- Archive contents preview with file list and sizes
- Password input for encrypted archives
- Animated progress bar during extraction

**Visual Design**
- Monochrome toolbar icons with accent-color hover (replaced multi-color scheme)
- Clean card-based form layout with subtle borders and shadows
- Full dark mode with moon/sun toggle button, respects `prefers-color-scheme`
- Light theme: cool gray palette with blue accent
- Dark theme: deep purple-tone palette with lighter accent
- Theme preference persisted in localStorage
- `color-mix()` for message backgrounds, animated progress stripes, fade-in transitions
- Custom scrollbar styling, focus rings on all inputs, uppercase column headers

## File Format (.dzip)

```
┌─────────────────────────────────────────────────────────────┐
│ Magic Bytes (8 bytes) = "DODAZIP\x00"                       │
├─────────────────────────────────────────────────────────────┤
│ Archive Header (40 bytes)                                    │
│ - flags (4 bytes)                                            │
│     bit 0 = encrypted                                        │
│     bit 1 = has ECC                                          │
│     bit 2 = has chunk table                                  │
│ - chunk_count (4 bytes)                                       │
│ - index_offset (8 bytes)                                      │
│ - metadata_offset (8 bytes)                                   │
│ - chunk_table_offset (8 bytes)                               │
├─────────────────────────────────────────────────────────────┤
│ Encryption Params (if encrypted, 52 bytes)                   │
│ - salt (16 bytes)                                             │
│ - nonce (24 bytes)                                            │
│ - iterations (4 bytes)                                        │
│ - memory_cost (4 bytes)                                       │
│ - parallelism (4 bytes)                                       │
├─────────────────────────────────────────────────────────────┤
│ Data Chunks (variable)                                        │
│ For each chunk:                                               │
│   - ChunkHeader (4 + 4 + 4 + 2 + 2 + 32 = 48 bytes)      │
│     magic (4 bytes) = "CHNK"                                 │
│     compressed_size (4 bytes)                                 │
│     original_size (4 bytes)                                   │
│     codec_id (2 bytes)                                        │
│     flags (2 bytes)                                           │
│     blake3_hash (32 bytes)                                   │
│   - compressed_data (variable) [encrypted if archive is]    │
│                                                               │
│   ECC Parity (if ECC enabled, variable)                      │
│   - magic (4 bytes) = "ECCP"                                 │
│   - EccParams (4 + 4 + 4 + 8 = 20 bytes)                   │
│   - num_parity_shards (4 bytes)                              │
│   - parity shards (variable)                                 │
├─────────────────────────────────────────────────────────────┤
│ Chunk Table (variable, magic = "CTBL")                      │
│ - num_entries (4 bytes)                                       │
│ - entries: chunk_offset (8) + compressed_size (4) + ...    │
│   O(1) random access to any chunk without iteration         │
├─────────────────────────────────────────────────────────────┤
│ Central Index (variable, encrypted if archive is)            │
│ - magic (4 bytes) = "INDX"                                   │
│ - per-file entries with chunk references, hashes, metadata  │
├─────────────────────────────────────────────────────────────┤
│ Metadata (magic = "META")                                    │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

For detailed onboarding and a step-by-step fresh environment checklist, see [RESUME_GUIDE.md](RESUME_GUIDE.md).

### 1. Build CLI (Windows & Linux)

```bash
# Build optimized release binary
cargo build --release

# Binary output:
# Windows: .\target\release\dodazip.exe
# Linux:   ./target/release/dodazip
```

### 2. Build & Run Desktop GUI (Tauri v2)

#### Windows Prerequisites
- **Node.js 20+ LTS** (`winget install OpenJS.NodeJS.LTS`)
- **Visual Studio 2022 C++ Build Tools** with "Desktop development with C++"
- **Rust MSVC** (`rustup default stable-x86_64-pc-windows-msvc`)
- *(WebView2 is pre-installed on Windows 10 & 11)*

#### Linux Prerequisites (Debian/Ubuntu)
```bash
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev
# Optional for FUSE mounting:
sudo apt-get install libfuse3-dev
```
*(If building without root on Linux, use `scripts/setup-deps.sh` and `scripts/build-tauri.sh`).*

#### Development & Build Commands
```bash
# 1. Install frontend dependencies
cd ui
npm install
npm run build
cd ..

# 2. Run in development mode (hot reload)
npm run tauri dev
# or
cargo tauri dev

# 3. Build production installer / package
cargo tauri build
```

### 3. Build Disk Space & Cleanup
DodaZip uses a unified Cargo workspace. Both the CLI and Tauri GUI share `./target/`, and compiler profiles are tuned (`debug = 1` and `strip = true`) to prevent massive disk bloat:
```bash
# Clean target/ and dist/
./scripts/clean.sh         # Linux / macOS
.\scripts\clean.ps1        # Windows PowerShell
npm run clean              # Cross-platform via npm

# Sweep stale build caches (keeping active build artifacts):
./scripts/clean.sh --sweep # Linux
.\scripts\clean.ps1 -Sweep # Windows

# Deep clean (including node_modules):
./scripts/clean.sh --deep  # Linux
.\scripts\clean.ps1 -Deep  # Windows
```

## CLI Usage

```bash
# Basic native compression
./target/release/dodazip compress --output archive.dzip file1.txt dir2/

# With LZMA2 (7-Zip/xz compression) + Maximum level
./target/release/dodazip compress --output archive.dzip \
  --codec lzma2 --level maximum *.txt

# With ECC (self-healing)
./target/release/dodazip compress --output archive.dzip \
  --ecc medium *.txt

# Create ENCRYPTED archive
./target/release/dodazip compress --output secret.dzip \
  --password "MySecurePassword123" confidential.txt

# ALL FEATURES together
./target/release/dodazip compress --output all_features.dzip \
  --codec lzma2 --level maximum --ecc high \
  --password "secret" my_files/

# --- Foreign format compression (CLI) ---
./target/release/dodazip compress --output archive.zip file1.txt dir2/
./target/release/dodazip compress --output archive.7z file1.txt dir2/
./target/release/dodazip compress --output archive.tar dir2/
./target/release/dodazip compress --output archive.tar.gz dir2/

# List archive contents (all formats)
./target/release/dodazip list archive.dzip
./target/release/dodazip list --password "secret" secret.dzip
./target/release/dodazip list archive.zip
./target/release/dodazip list archive.7z
./target/release/dodazip list archive.rar
./target/release/dodazip list archive.tar.gz

# Extract (all formats)
./target/release/dodazip extract --output ./dest archive.dzip
./target/release/dodazip extract --output ./dest archive.zip
./target/release/dodazip extract --output ./dest archive.7z
./target/release/dodazip extract --output ./dest archive.rar
./target/release/dodazip extract --output ./dest archive.tar.xz

# Mount native archive as filesystem (requires FUSE build)
mkdir -p /tmp/mnt
./target/release/dodazip mount --archive archive.dzip --mount-point /tmp/mnt

# Press Ctrl+C to unmount

# Run benchmarks
./target/release/dodazip bench
```

## Compression Levels

| Level | Zstd Level | LZMA2 Level | Use Case |
|-------|------------|-------------|----------|
| `fast` | 1 | 3 | Real-time, streaming |
| `balanced` | 10 | 6 | General purpose (default) |
| `maximum` | 22 | 9 | Maximum compression, archival |

## Codecs

| Codec | ID | Description |
|-------|-----|-------------|
| `zstd` | 0x0001 | Zstandard — great ratio/speed balance (default) |
| `lzma2` | 0x0003 | LZMA2 — 7-Zip/xz high compression ratio |
| `lz4` | 0x0002 | LZ4 — extremely fast, moderate ratio |
| `store` | 0x0000 | No compression — for incompressible data |

## ECC Levels (Self-Healing Archives)

| Level | Data Shards | Parity Shards | Max Repairable | Overhead |
|-------|-------------|---------------|----------------|----------|
| `low` | 8 | 2 | 2 shards | ~25% |
| `medium` | 8 | 4 | 4 shards | ~50% |
| `high` | 8 | 8 | 8 shards | ~100% |

## Encryption Details

- **Cipher**: XChaCha20-Poly1305 (AEAD — Authenticated Encryption with Associated Data)
- **Key Derivation**: Argon2id (memory-hard, resistant to GPU/ASIC attacks)
  - Default: 64MB memory, 3 iterations, 4 threads
- **Nonce**: 24-byte XChaCha20 nonces (cryptographically random per encryption)
- **Authentication**: Poly1305 tags ensure integrity and authenticity

Both data chunks and the central file index are encrypted. Without the correct password, an attacker cannot:
- Read file contents
- See filenames or metadata
- Modify the archive without detection

## GUI Screens

- **Home** — File browser with breadcrumb path navigation, Up button, quick-filter search bar, sticky sortable file list, dark mode toggle, toolbar (New/Open/Add To/Extract To), status bar with estimated selected size, right-click context menu
- **Create Archive** — Card-based form with output path + format selector, segmented compression control, password protection with XChaCha20-Poly1305, ECC recovery with level selector, animated progress bar
- **Extract Archive** — Card-based form with archive path, output directory, password toggle, List Contents preview, animated progress bar, success/error messages

## Windows Shell Integration

DodaZip provides native Windows Explorer cascading context menus:
- **Right-click `.dzip` archives:** Smart Unpack, extract to folder, inspect & extract with GUI, or verify integrity.
- **Right-click any files/folders:** Cascading "⚡ Add to .dzip (Extreme)" menu.

To register on Windows:
```cmd
regedit /s scripts\install-context-menu.reg
```
To unregister:
```cmd
regedit /s scripts\uninstall-context-menu.reg
```

## Technology Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| **Core Language** | Rust | Memory safety, zero-cost abstractions, cross-compilation |
| **Compression** | Zstd, LZ4, LZMA2 | Industry-standard, excellent performance |
| **Hashing** | BLAKE3 | Cryptographic, fast, parallelizable |
| **Chunking** | FastCDC | Content-defined chunking for deduplication |
| **Encryption** | XChaCha20-Poly1305 + Argon2id | Modern, secure, audited libraries |
| **ECC** | Reed-Solomon-NovelPoly | O(n lg n) complexity, fast |
| **CLI** | clap | Rust standard, powerful argument parsing |
| **FUSE** | fuser | Linux FUSE bindings |
| **GUI Framework** | Tauri v2 | Tiny binaries, OS WebViews, Android/iOS support |
| **Frontend** | React + TypeScript + Vite | Modern, fast development |
| **Foreign Archives** | zip, sevenz-rust, unrar, tar, flate2, bzip2, xz2 | Read/write 14 formats |

## Project Structure

```
dodazip/
├── Cargo.toml                  # Workspace root (CLI + GUI profiles & workspace definition)
├── Cargo.lock                  # Pinned dependencies
├── README.md                   # Full product overview & documentation
├── RESUME_GUIDE.md             # Windows onboarding & resume guide
├── package.json                # Project npm scripts (dev, build, tauri, clean)
│
├── src/                        # Core Rust library + CLI binary (dodazip crate)
│   ├── lib.rs                  # Module exports
│   ├── main.rs                 # CLI entry point (all formats)
│   ├── format.rs               # Archive format definitions
│   ├── chunk.rs                # Compression, chunking, hashing
│   ├── crypto.rs               # Encryption (XChaCha20-Poly1305, Argon2id)
│   ├── ecc.rs                  # Reed-Solomon erasure coding
│   ├── fuse.rs                 # FUSE filesystem (feature-gated)
│   └── archive.rs              # ArchiveBuilder and ArchiveReader
│
├── scripts/
│   ├── clean.sh                # Linux / macOS disk cleanup utility
│   ├── clean.ps1               # Windows PowerShell disk cleanup utility
│   ├── build-tauri.sh          # Linux build helper
│   ├── setup-deps.sh           # Linux rootless dependencies downloader
│   ├── install-context-menu.reg   # Windows Explorer right-click integration
│   ├── uninstall-context-menu.reg # Windows Explorer right-click uninstaller
│   └── install-context-menu.sh    # Linux file-manager context menu installer
│
├── src-tauri/                  # Tauri GUI backend (dodazip-ui crate)
│   ├── Cargo.toml              # GUI Rust dependencies (inherits root workspace)
│   ├── tauri.conf.json         # Tauri configuration
│   └── src/
│       └── main.rs             # Tauri commands (list, compress, extract — all formats)
│
└── ui/                         # React + TypeScript frontend
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── dist/
    └── src/
        ├── main.tsx
        ├── App.tsx             # Router-only: Home / CompressView / ExtractView
        ├── index.css           # Full stylesheet (light + dark themes, context menu, etc.)
        ├── types/
        │   └── index.ts        # FileInfo, ArchiveEntry, CompressionLevel, EccLevel
        ├── utils/
        │   ├── helpers.ts      # formatSize, getFileExtension, isArchiveFile, ARCHIVE_TYPES
        │   ├── preferences.ts  # localStorage persistence (lastDir, theme, compression)
        │   └── tauriBridge.ts  # Typed interface to Tauri backend IPC
        ├── components/
        │   ├── Icons.tsx       # 20+ SVG icon components (monochrome, currentColor)
        │   ├── Toolbar.tsx     # Reusable toolbar (New/Open/Add To/Extract To or Back)
        │   ├── ProgressBar.tsx # Animated progress bar with label + percentage
        │   ├── Message.tsx     # Info/success/error status messages
        │   └── ContextMenu.tsx # Right-click context menu component
        └── pages/
            ├── Home.tsx        # File browser with all navigation + selection features
            ├── CompressView.tsx # Archive creation with format/compression/password/ECC
            └── ExtractView.tsx  # Archive extraction with contents preview
```

## Cargo Features

| Feature | Dependencies | Description |
|---------|--------------|-------------|
| `default` | None | Standard CLI build |
| `fuse` | fuser, libc | FUSE mount support (requires libfuse3-dev) |

## Roadmap

### Phase 1: Core Enhancement ✓
- [x] Encryption (XChaCha20-Poly1305 + Argon2id)
- [x] Reed-Solomon ECC
- [x] LZMA2 codec
- [x] Tauri v2 project structure
- [x] Solid archives with random-access chunk table
- [x] FUSE mount support
- [x] Foreign format read support: ZIP, 7z, RAR
- [x] Foreign format write support: ZIP, 7z, tar, tar.gz, tar.bz2, tar.xz, gz, bz2, xz
- [x] Native format extension: `.dzip`

### Phase 2: GUI Integration ✓
- [x] Full GUI with compress/extract operations
- [x] Professional desktop UI with card-based layouts, dark mode, breadcrumbs
- [x] Simplified compression options (segmented button group)
- [x] Format selector dropdown for output
- [x] Directory browser with breadcrumb nav, sortable columns, quick filter
- [x] Monochrome toolbar icons, keyboard shortcuts, context menu
- [x] Modular code structure (pages/components/types/utils)

### Phase 3: Advanced Features
- [x] Real progress events from Tauri backend (dzip format; fallback spinner for others)
- [ ] Drag files out of the app to the desktop / other apps
- [x] Inline file rename (context menu → inline rename input)
- [x] Archive conversion tool (context menu → Convert Format → re-pack to .zip)
- [x] Split volume archives (.001, .002, ...)
- [x] Archive integrity check / verify (context menu → Verify Integrity)
- [x] Delete files (context menu → Delete with confirmation)
- [x] Smart Unpack (prevents zip-bomb desktop clutter)
- [x] Security Risk Shield (malware/script detection on extraction)
- [ ] Multi-tab file browser
- [ ] Android JNI wrapper
- [ ] Cloud streaming (S3)
- [ ] Versioned/delta archives

## Benchmarks

Sample results on 10MB test data with repeating patterns:

```
Fast (Zstd):
  Ratio: 37.49x
  Space saving: 97.3%
  Compress time: ~47ms

Balanced (Zstd):
  Ratio: 9149.88x
  Space saving: 100.0%
  Compress time: ~66ms

Maximum (Zstd):
  Ratio: 9882.90x
  Space saving: 100.0%
  Compress time: ~606ms
```

## License & Open Source Strategy

This project is licensed under **MIT OR Apache-2.0**.

- **Free & Open Source:** The core CLI, `.dzip` compression library, and desktop source code are fully open-source to maximize adoption of the format.
- **Store Distribution:** Packaged editions on the Microsoft Store and Mac App Store provide auto-updating, sandboxed convenience for end users.

## Changelog

### v0.5.1 (Current)
- **Unified Cargo Workspace**: Consolidated the root CLI and Tauri desktop backend (`src-tauri`) under a single workspace. Caches are shared, eliminating duplicate dependency compilation.
- **Tuned Compiler Profiles**: Configured `debug = 1` and `split-debuginfo = "unpacked"` for development builds (saving 60–80% disk cache) and enabled `strip = true` on release builds.
- **Disk Cleanup Utility**: Added `scripts/clean.sh` (Linux/macOS), `scripts/clean.ps1` (Windows PowerShell), and `npm run clean` with `--sweep` and `--deep` options to reclaim target disk space.
- **Windows Onboarding Guide**: Added comprehensive `RESUME_GUIDE.md` detailing fresh Windows prerequisites, build steps, context menu registry setup, and backup best practices.

### v0.5.0
- **Migrated native format to `.dzip`**: Clean, recognizable 4-letter extension with `.zip` affinity. All legacy baggage removed.
- **Extra Compression Engine**:
  - `.zip` files now use Deflate Level 9 (maximum standard compression) with automatic pre-compressed media bypass (`.jpg`, `.mp4`, `.png`, etc. stored uncompressed to avoid inflation).
  - `.dzip` archives use adaptive chunk windows (up to 4MB) and LZMA2 Extreme Preset (`9 | 0x8000_0000`) for maximum byte reduction.
- **Hero Format Cards**: Quick toggle between `.dzip` Vault, `.zip` Universal, and `.7z` High-Ratio cards with real-time compression badges.
- **Volume Splitting Presets**: Single click splits for Discord (25MB), Email (20MB), FAT32 (4GB), or custom split sizes.
- **Smart Unpack**: Protects users from loose file zip-bombs by automatically isolating multi-file flat archives into a dedicated folder.
- **Security Risk Shield**: Scans archive contents before extraction and alerts on executable payloads (`.exe`, `.bat`, `.ps1`, `.scr`, `.iso`) and deceptive double extensions.

### v0.4.0
- **Real progress events**: Tauri backend emits `compress_progress` and `extract_progress` events; dzip format shows real per-file progress, foreign formats use fallback
- **Integrity verification**: Right-click archive → Verify Integrity — validates archive structure and reports entry count + total size
- **Archive conversion**: Right-click archive → Convert Format — re-packs to `.zip` (or custom path) preserving all files
- **Inline rename**: Right-click → Rename — inline text input in header bar, confirm with Enter or blur
- **Delete files**: Right-click → Delete with confirmation dialog
- **Colorized compress/extract forms**: Label dots, colored format badges with per-format colors (blue=dodaz, cyan=zip, violet=7z, warm=tar, red=gz/bz2/xz), compression button accent colors
- **New backend commands**: `verify_archive`, `rename_file`, `convert_archive`, `delete_file`
- **Context menu expanded**: Verify Integrity, Convert Format, Rename, Delete
- **Backward-compatible**: All existing commands unchanged, `app_handle` auto-injected by Tauri

### v0.3.0
- **Modular UI restructure**: Separated App.tsx into `pages/`, `components/`, `types/`, `utils/` directories
- **Professional UI redesign**: Removed 3px border, added 1px + inset shadow; monochrome `currentColor` toolbar icons (was multi-color); bumped all spacing/font sizes 1-2px; card-based form layout with shadow; focus rings on all inputs
- **File-type-specific icons**: Distinct SVG icons for `.dodaz` (shield), `.zip` (dots), `.7z` (7-shaped), `.rar` (R-shaped), `.tar` (square), `.gz`/`.bz2`/`.xz` (compressed arrow)
- **Keyboard shortcuts**: `Ctrl+N`, `Ctrl+O`, `Ctrl+A`, `F5`, `Escape` (clear filter/deselect), `Enter` (open/compress)
- **Sortable columns**: Click Name/Size headers to toggle asc/desc with ▲/▼ indicators
- **Breadcrumb navigation**: Clickable path segments (`/` › `home` › `user` › `Documents`)
- **Quick filter**: Search box in header bar with live client-side file filtering and clear button
- **Right-click context menu**: Custom menu per file row — Add to Archive, Extract Here (archives), Properties
- **Estimated size**: Status bar shows total selected file size
- **Dark mode**: Full dark theme with purple-tone palette, toggle button (moon/sun), `prefers-color-scheme` detection, persisted in localStorage
- **Preferences persistence**: Last directory, compression setting, and theme saved to localStorage
- **Segmented compression buttons**: Pill-style toggle group (Fastest / Normal / Maximum / Store)
- **Animated progress bar**: Diagonal stripe animation on progress fill
- **Cleaner empty/loading states**: Icon + descriptive text replaces bare gray text
- **Address bar**: Replaced plain text input with breadcrumb nav + separate search box

### v0.2.0
- **Foreign format write support**: Create .zip, .7z, .tar, .tar.gz/.tgz, .tar.bz2/.tbz2, .tar.xz/.txz, .gz, .bz2, .xz archives (CLI + GUI)
- **Foreign format read support**: List/extract .tar, .tar.gz, .tar.bz2, .tar.xz, .gz, .bz2, .xz (added to existing .zip/.7z/.rar support)
- **Native format extension**: Changed from `.dz` to `.dodaz`
- **GUI redesign**: WinRAR/7-zip professional toolbar, 3px borders, flat light theme (replaced glassmorphism)
- **Simplified compression**: Unified "Compression" dropdown (Fastest / Normal / Maximum / No compression)
- **Format selector**: Dropdown with 10 output formats (.dodaz, .zip, .7z, .tar, .tar.gz, .tar.bz2, .tar.xz, .gz, .bz2, .xz)
- **File list font**: Increased to 13px for better readability
- **Tauri**: Added flate2, bzip2, xz2, tar deps for backend compression
- **Build**: `scripts/setup-deps.sh` and `scripts/build-tauri.sh` for rootless Tauri builds

### v0.1.1
- Checkbox-based file selection with select-all toggle
- Drag-and-drop support with visual overlay
- Password strength meter
- Fixed TypeScript errors
- Initial Tauri GUI release

### v0.1.0
- Core compression/decompression with Zstd, LZ4, LZMA2
- FastCDC deduplication, BLAKE3 integrity, XChaCha20-Poly1305 + Argon2id encryption
- Reed-Solomon ECC, random-access chunk table, FUSE mount
- CLI with compress/extract/list/bench/mount commands
