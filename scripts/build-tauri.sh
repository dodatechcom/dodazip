#!/bin/bash
# Build Tauri app with locally extracted system dependencies
export PKG_CONFIG_PATH="/home/admin1/tauri-deps/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/lib/x86_64-linux-gnu/pkgconfig"
export CPATH="/home/admin1/tauri-deps/usr/include"
export LIBRARY_PATH="/home/admin1/tauri-deps/usr/lib/x86_64-linux-gnu"
export LD_LIBRARY_PATH="/home/admin1/tauri-deps/usr/lib/x86_64-linux-gnu"

cd "$(dirname "$0")/.."

case "${1:-build}" in
  check)
    cd src-tauri && cargo check "$@"
    ;;
  build)
    cd src-tauri && cargo build "$@"
    ;;
  run)
    cd src-tauri && cargo run "$@"
    ;;
  release)
    cd src-tauri && cargo build --release "$@"
    ;;
  clean)
    cargo clean
    rm -rf src-tauri/target ui/dist
    echo "✓ Build artifacts cleaned."
    ;;
  *)
    echo "Usage: $0 {check|build|run|release|clean}"
    exit 1
    ;;
esac
