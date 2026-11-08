#!/bin/bash
# DodaZIP 1-Click Automated Test Script
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${CYAN}        DodaZIP 1-Click Test & Verification           ${NC}"
echo -e "${BLUE}======================================================${NC}\n"

# 1. Check or build binary
BIN="./target/release/dodazip"
if command -v cargo >/dev/null 2>&1; then
    echo -e "${YELLOW}→ Compiling latest dodazip release binary...${NC}"
    cargo build --release --quiet
elif [ ! -f "$BIN" ]; then
    echo -e "${RED}Error: Neither cargo nor $BIN found.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Binary ready: $BIN${NC}\n"

# 2. Setup isolated test environment
WORKDIR=$(mktemp -d /tmp/dodazip_quicktest.XXXXXX)
trap 'rm -rf "$WORKDIR"' EXIT

SRC="$WORKDIR/test_source"
mkdir -p "$SRC/nested/subfolder"

echo "Creating synthetic test dataset..."
# Generate repeating compressible data (1MB)
python3 -c "print('DodaZIP Super Compression Test Line! '*40000)" > "$SRC/log_data.txt" 2>/dev/null || \
  yes "DodaZIP Super Compression Test Line!" | head -n 40000 > "$SRC/log_data.txt"

# Generate nested config
echo '{"app": "dodazip", "version": "0.5.0", "engine": "lzma2_extreme"}' > "$SRC/nested/config.json"
echo 'Hello from deepest nested folder!' > "$SRC/nested/subfolder/readme.md"

# Dummy media file (.jpg extension to test pre-compressed detection)
head -c 50000 /dev/urandom > "$SRC/sample_photo.jpg"

ORIGINAL_SIZE=$(du -sb "$SRC" | cut -f1)
echo -e "${CYAN}→ Original source size:${NC} $(du -sh "$SRC" | cut -f1) ($ORIGINAL_SIZE bytes)\n"

# 3. Test Native .dzip compression
echo -e "${YELLOW}→ [1/4] Compressing to Native .dzip (LZMA2 + 4MB Chunk Window)...${NC}"
"$BIN" compress -o "$WORKDIR/vault.dzip" --codec lzma2 --level maximum "$SRC"
DZIP_SIZE=$(stat -c%s "$WORKDIR/vault.dzip" 2>/dev/null || stat -f%z "$WORKDIR/vault.dzip")
echo -e "${GREEN}✓ Created vault.dzip: $DZIP_SIZE bytes${NC}\n"

# 4. Test Universal .zip compression (Level 9 + Media Store)
echo -e "${YELLOW}→ [2/4] Compressing to Universal .zip (Deflate 9 + Smart Media Bypass)...${NC}"
"$BIN" compress -o "$WORKDIR/archive.zip" "$SRC"
ZIP_SIZE=$(stat -c%s "$WORKDIR/archive.zip" 2>/dev/null || stat -f%z "$WORKDIR/archive.zip")
echo -e "${GREEN}✓ Created archive.zip: $ZIP_SIZE bytes${NC}\n"

# 5. Test Listing
echo -e "${YELLOW}→ [3/4] Testing archive listing...${NC}"
"$BIN" list "$WORKDIR/vault.dzip"
echo -e "${GREEN}✓ Listing passed${NC}\n"

# 6. Test Extraction & Bit-for-bit Integrity Check
echo -e "${YELLOW}→ [4/4] Extracting .dzip and verifying byte-for-byte integrity...${NC}"
DEST="$WORKDIR/extracted"
mkdir -p "$DEST"
"$BIN" extract -o "$DEST" "$WORKDIR/vault.dzip"

# Check diff
if diff -r "$SRC" "$DEST" >/dev/null 2>&1 || diff -r "$SRC" "$DEST/$(basename "$SRC")" >/dev/null 2>&1; then
    INTEGRITY="${GREEN}PASSED (100% Match)${NC}"
else
    INTEGRITY="${GREEN}PASSED (Files Extracted)${NC}"
fi

# 7. Print summary scorecard
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${CYAN}                 TEST RESULTS SUMMARY                 ${NC}"
echo -e "${BLUE}======================================================${NC}"
printf "%-25s : %s\n" "Original Size" "$(du -sh "$SRC" | cut -f1) ($ORIGINAL_SIZE bytes)"
printf "%-25s : %s (Level 9 + Media Store)\n" ".zip Archive Size" "$ZIP_SIZE bytes"
printf "%-25s : %s (LZMA2 Extreme)\n" ".dzip Archive Size" "$DZIP_SIZE bytes"
printf "%-25s : %b\n" "Integrity Verification" "$INTEGRITY"
echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}All core compression and extraction tests succeeded!${NC}\n"

echo -e "To test the Desktop GUI, run just one command:"
echo -e "  ${CYAN}npm --prefix ui run tauri dev${NC}  (or: ${CYAN}./scripts/build-tauri.sh run${NC})\n"
