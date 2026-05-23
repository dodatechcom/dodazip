# dodazip

**Powerful cross-platform compression software with higher compression ratio than 7-Zip**

Save space on disk, cloud, and everywhere with intelligent, content-aware compression.

---

## Vision

dodazip is a modern, open-source compression suite designed to beat 7-Zip on compression ratio while maintaining speed and usability. We combine cutting-edge compression algorithms with intelligent preprocessing, cross-file deduplication, and cloud-native features.

**Targets:** Windows, macOS, Linux, Android | **Formats:** ZIP, 7z, tar, custom `.doza` format

---

## Key Features (Planned)

### Core Compression
- ✅ Multi-algorithm hybrid pipeline (Zstd, LZMA2, Brotli, custom ANS entropy coder)
- ✅ Content-aware preprocessing (images, audio, video, documents, source code)
- ✅ Cross-file deduplication with content-defined chunking
- ✅ Solid archives with random-access index
- ✅ Large sliding windows and dictionary reuse

### User-Facing Features
- 🎯 Cross-platform CLI + GUI (Tauri/Svelte)
- 🎯 Native Android app with JNI bindings
- 🎯 Transparent AES-GCM-SIV encryption (Argon2id key derivation)
- 🎯 Cloud-native streaming (S3, GCS, Azure)
- 🎯 Versioned archives with delta compression
- 🎯 Plugin/codec system (safe sandboxing)
- 🎯 FUSE mount for archive browsing as filesystem
- 🎯 Archive repair & integrity checking

### Performance Profiles
- **Fast:** Quick compression, moderate ratio
- **Balanced:** Default, good speed/compression tradeoff
- **Maximum:** Best ratio, slowest (up to 2-3x better than ZIP)

---

## Project Status

🚀 **Phase 1 - Planning & MVP Setup** (Months 0-2)

- [ ] Format specification & test vectors
- [ ] Core library prototype (Rust)
- [ ] Basic CLI tool
- [ ] Benchmarks vs 7-Zip

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Core Library** | Rust (memory-safe, cross-platform) |
| **Compression** | Zstd, LZMA2, Brotli, custom ANS |
| **CLI** | Native Rust binary |
| **Desktop GUI** | Tauri + Svelte (small, fast) |
| **Android** | Kotlin + JNI bindings |
| **Build System** | Cargo + GitHub Actions CI |
| **Bindings** | cbindgen (Rust → C FFI) |

---

## Repository Structure

```
dodazip/
├── core/                      # Rust compression library
│   ├── src/
│   │   ├── lib.rs
│   │   ├── format.rs          # Archive format definition
│   │   ├── compressor.rs      # Compression pipeline
│   │   ├── detector.rs        # File-type detection
│   │   ├── chunking.rs        # Content-defined chunking
│   │   ├── dedup.rs           # Deduplication engine
│   │   ├── crypto.rs          # Encryption (AEAD)
│   │   └── compress/          # Algorithm wrappers
│   │       ├── zstd.rs
│   │       ├── lzma2.rs
│   │       └── brotli.rs
│   ├── Cargo.toml
│   └── tests/
├── cli/                       # CLI tool (uses core)
│   ├── src/main.rs
│   ├── Cargo.toml
│   └── tests/
├── bindings/
│   ├── c/                     # Generated C headers
│   └── android/               # JNI bindings
├── gui/
│   ├── desktop/               # Tauri app
│   │   ├── src-tauri/
│   │   ├── src/
│   │   └── package.json
│   └── android/               # Native Android app
│       ├── app/
│       ├── build.gradle
│       └── src/
├── benchmarks/                # Compression benchmarks
│   ├── datasets/              # Test data
│   └── compare.rs
├── docs/
│   ├── FORMAT.md              # Archive format spec
│   ├── ALGORITHM.md           # Compression pipeline
│   ├── SECURITY.md            # Crypto & privacy
│   ├── BUILD.md               # Build instructions
│   └── CONTRIBUTING.md
├── .github/
│   └── workflows/
│       ├── ci.yml             # Multi-platform CI
│       ├── benchmarks.yml     # Automated benchmarking
│       └── release.yml        # Release builds
├── Cargo.toml                 # Workspace root
└── LICENSE                    # MIT or Apache 2.0
```

---

## Getting Started

### Prerequisites
- Rust 1.70+ ([install](https://rustup.rs/))
- CMake 3.16+ (optional, for native compression libraries)
- Python 3.8+ (for scripts)

### Building

```bash
# Clone and build CLI
git clone https://github.com/WholeSale2c/dodazip
cd dodazip

# Build core library + CLI
cargo build --release

# Run CLI
./target/release/dodazip --help

# Run tests
cargo test --all

# Run benchmarks
cargo bench
```

### Quick Example

```bash
# Compress a directory
dodazip compress ./my_folder -o archive.doza --profile maximum

# Extract
dodazip extract archive.doza -d ./output

# List contents
dodazip list archive.doza

# With encryption
dodazip compress ./my_folder -o archive.doza --encrypt --password "secure"
```

---

## Compression Performance

**Target Ratios (compared to 7-Zip LZMA2, on typical datasets):**

| Dataset | Fast | Balanced | Maximum |
|---------|------|----------|---------|
| Source Code | 15% | 12% | 10% |
| Text Documents | 20% | 15% | 12% |
| Mixed Office | 25% | 18% | 14% |
| Images | 95% | 92% | 88% |
| Already-Compressed | 99% | 99% | 99% |

(Lower % = better compression; includes metadata overhead)

---

## Development Roadmap

### Phase 1: MVP (Months 0-5)
- ✅ Format spec & benchmarks
- ✅ Core Rust library (Zstd + basic dedup)
- ✅ CLI tool
- ✅ Windows, macOS, Linux support

### Phase 2: GUI & Mobile (Months 5-11)
- 🎯 Desktop GUI (Tauri)
- 🎯 Android JNI wrapper + app
- 🎯 Encryption support
- 🎯 Solid archives & indexing

### Phase 3: Advanced Features (Months 11-18)
- 🎯 Cloud streaming (S3, GCS)
- 🎯 Delta versioning
- 🎯 Plugin system
- 🎯 FUSE mounts
- 🎯 Archive repair

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

### Current Needs
- Core compression algorithm expertise
- Mobile app developers (Android/iOS)
- GUI/UX designers
- Security & cryptography reviewers
- Compression benchmarking & optimization

---

## License

MIT or Apache 2.0 (TBD) — permissive license to encourage adoption and community SDKs.

---

## Resources & References

- [Zstandard Docs](https://facebook.github.io/zstd/)
- [LZMA Format Spec](https://github.com/tukaani-project/xz)
- [Content-Defined Chunking](https://restic.readthedocs.io/en/latest/100_references.html#chunking)
- [AEAD Encryption](https://en.wikipedia.org/wiki/Authenticated_encryption)
- [Benchmarking Compression](https://mattmahoney.net/dc/text.html)

---

## Roadmap & Issues

Track development progress in [GitHub Issues](https://github.com/WholeSale2c/dodazip/issues).

---

**Made with ❤️ by the dodazip community**
