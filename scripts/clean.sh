#!/bin/bash
# DodaZip Workspace Cleanup Utility
# Reclaims disk space from build artifacts and intermediate caches.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}=== DodaZip Disk Cleanup Utility ===${NC}"

case "${1:-}" in
  --sweep)
    if command -v cargo-sweep >/dev/null 2>&1; then
      echo -e "${YELLOW}→ Sweeping stale build artifacts (keeping only active build)...${NC}"
      cargo sweep --installed
      echo -e "${GREEN}✓ Cargo sweep completed.${NC}"
    else
      echo -e "${YELLOW}cargo-sweep is not installed.${NC}"
      echo "To install: cargo install cargo-sweep"
      echo "Falling back to standard cargo clean..."
      cargo clean
      rm -rf src-tauri/target ui/dist
      echo -e "${GREEN}✓ Standard clean completed.${NC}"
    fi
    ;;

  --deep)
    echo -e "${YELLOW}→ Performing deep clean (targets + dist + node_modules)...${NC}"
    cargo clean
    rm -rf target src-tauri/target ui/dist ui/node_modules node_modules
    rm -rf /tmp/dodazip_* extracted test_extract test_files test_comprehensive
    echo -e "${GREEN}✓ Deep clean completed. All intermediate and generated files removed.${NC}"
    ;;

  *)
    echo -e "${YELLOW}→ Cleaning build targets and distribution artifacts...${NC}"
    cargo clean 2>/dev/null || rm -rf target
    rm -rf src-tauri/target ui/dist
    rm -rf /tmp/dodazip_* extracted test_extract test_files test_comprehensive
    echo -e "${GREEN}✓ Clean completed.${NC}"
    echo -e "Usage tips:"
    echo -e "  ${CYAN}./scripts/clean.sh${NC}         # Standard clean (target, dist, test files)"
    echo -e "  ${CYAN}./scripts/clean.sh --sweep${NC} # Keep latest build, remove stale intermediate objects"
    echo -e "  ${CYAN}./scripts/clean.sh --deep${NC}  # Deep clean including node_modules"
    ;;
esac
