# DodaZip — Product Roadmap & Future Milestones

This document tracks planned features, enhancements, and architectural milestones for upcoming versions of DodaZip beyond **v0.2.0**.

---

## 🎯 v0.3.0 Milestone: Portability & Distribution

### 1. 📦 Self-Extracting Archives (SFX)
- **Goal:** Allow users to create standalone `.exe` archives that unpack themselves on any Windows machine with a single double-click.
- **Implementation:** 
  - Embed a lightweight, headless Rust stub extractor (`sfx-stub.exe`, ~150 KB).
  - Append the compressed `.dzip` or `.zip` payload with an offset marker.
  - Optional custom GUI prompt for target directory and extraction password.

### 2. ☁️ Automated Cloudflare R2 Bucket CDN Deployment
- **Goal:** Push compiled binaries and updates to Cloudflare R2 bucket (`download.dodatech.com`) alongside GitHub Releases.
- **Implementation:**
  - Standard S3-compatible API upload script (`scripts/r2_upload.py`).
  - Automatic `latest.json` metadata sync for built-in in-app auto-updates.
  - Zero-cost egress bandwidth utilizing Cloudflare's global edge network.

### 3. 🐧 Cross-Platform Desktop Builds (Linux & macOS)
- **Goal:** Provide official binaries for Linux distributions and Apple macOS.
- **Implementation:**
  - **Linux:** Native `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL), `.AppImage`, and `.tar.gz`.
  - **macOS:** Universal `.dmg` bundle with Apple Silicon (aarch64) and Intel (x86_64) support.
  - Leverage Tauri v2's cross-platform runtime and existing memory-safe Rust core.

---

## 🎯 v0.4.0 Milestone: Advanced Power Tools

### 4. 🪟 Windows 11 Modern Context Menu (Sparse Package)
- **Goal:** Seamlessly appear in the primary top-level Windows 11 right-click menu without requiring users to click *"Show more options"*.
- **Implementation:**
  - Package an identity manifest (`AppxManifest.xml`) and register a Sparse Package via Windows MSIX APIs.
  - Implement `IExplorerCommand` COM interface for native Shell verbs.

### 5. 💬 Archive Comments & Metadata Annotations
- **Goal:** Add and edit descriptive comments, README notes, or license text directly embedded inside `.dzip` and `.zip` archives.
- **Implementation:**
  - GUI comment editor tab in the Archive Properties view.
  - CLI support: `dodazip comment <archive> "Deployment Build 2026-11"`.

### 6. ⚡ Multi-Core Accelerated Deduplication
- **Goal:** Scale FastCDC chunking and BLAKE3 hashing across all available CPU cores using Rayon chunk streaming for massive 100+ GB datasets.

---

*Last Updated: November 2026 &bull; DodaTech Engineering*
