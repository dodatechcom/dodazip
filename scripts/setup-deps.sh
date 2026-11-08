#!/bin/bash
# Download and extract Tauri system dependencies locally (no root required)
set -e

DEPS_DIR="${1:-$HOME/tauri-deps}"
mkdir -p "$DEPS_DIR"
cd "$DEPS_DIR"

echo "→ Downloading Tauri system dependencies to $DEPS_DIR ..."

packages=(
  libgtk-3-dev
  libwebkit2gtk-4.1-dev
  libayatana-appindicator3-dev
  librsvg2-dev
  # transitive deps
  libcairo2-dev libgdk-pixbuf-2.0-dev libatk1.0-dev libatk-bridge2.0-dev
  libpango1.0-dev libfribidi-dev libepoxy-dev libdatrie-dev libthai-dev
  libxft-dev libxcb-render0-dev libxcb-shm0-dev libpixman-1-dev
  libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
  libjpeg-turbo8-dev libdeflate-dev liblzma-dev libwebp-dev libzstd-dev
  libsharpyuv-dev libatspi2.0-dev libxtst-dev libxcomposite-dev libxdamage-dev
  libayatana-indicator3-dev libayatana-ido3-dev libdbusmenu-glib-dev
  libnghttp2-dev libpsl-dev libsqlite3-dev libsysprof-capture-4-dev
)

apt-get download "${packages[@]}" 2>&1

echo "→ Extracting ..."
for f in *.deb; do
  dpkg-deb -x "$f" . 2>/dev/null
done

echo ""
echo "✓ Dependencies extracted to $DEPS_DIR"
echo ""
echo "To build, run:"
echo "  export PKG_CONFIG_PATH=\"$DEPS_DIR/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/lib/x86_64-linux-gnu/pkgconfig\""
echo "  export CPATH=\"$DEPS_DIR/usr/include\""
echo "  export LIBRARY_PATH=\"$DEPS_DIR/usr/lib/x86_64-linux-gnu\""
echo "  export LD_LIBRARY_PATH=\"$DEPS_DIR/usr/lib/x86_64-linux-gnu\""
echo "  cd src-tauri && cargo build"
