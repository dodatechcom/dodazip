#!/bin/sh
# Install DodaZIP shell context menu actions
# Supported: Linux (GNOME/KDE via .desktop actions), macOS (via Automator)
# Windows: use install-context-menu.reg

set -e

install_linux() {
    local app_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
    mkdir -p "$app_dir"

    # Create the application desktop file with actions
    cat > "$app_dir/dodazip.desktop" << 'DESKTOP_EOF'
[Desktop Entry]
Type=Application
Name=DodaZIP
Comment=Cross-platform compression tool
Exec=dodazip
Icon=dodazip
Terminal=false
Categories=Utility;Archiving;Compression;
MimeType=application/x-dzip;application/zip;application/x-7z-compressed;application/x-rar;application/x-tar;application/gzip;application/x-bzip2;application/x-xz;

Actions=extract-here;extract-to;extract-gui;verify;compress-dzip;compress-zip;compress-gui

[Desktop Action extract-here]
Name=Extract Here (Smart Unpack)
Exec=dodazip extract -o "%f" -- "%f"

[Desktop Action extract-to]
Name=Extract to Subfolder
Exec=dodazip extract -- "%f"

[Desktop Action extract-gui]
Name=Inspect & Extract with DodaZIP...
Exec=dodazip-ui extract "%f"

[Desktop Action verify]
Name=Verify Integrity
Exec=dodazip verify -- "%f"

[Desktop Action compress-dzip]
Name=⚡ Add to .dzip (Extreme Vault)
Exec=dodazip compress --codec lzma2 --level maximum -o "%f.dzip" -- "%f"

[Desktop Action compress-zip]
Name=🌐 Add to .zip (Universal)
Exec=dodazip compress -o "%f.zip" -- "%f"

[Desktop Action compress-gui]
Name=🛡️ Add to Archive (DodaZIP)...
Exec=dodazip-ui compress "%f"
DESKTOP_EOF

    # Update MIME database for .dzip extension
    local mime_dir="${XDG_DATA_HOME:-$HOME/.local/share}/mime/packages"
    mkdir -p "$mime_dir"
    cat > "$mime_dir/dodazip.xml" << 'MIME_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-dzip">
    <comment>DodaZIP Archive</comment>
    <glob pattern="*.dzip"/>
  </mime-type>
</mime-info>
MIME_EOF

    # Register with the system
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database "$app_dir"
    fi
    if command -v update-mime-database >/dev/null 2>&1; then
        update-mime-database "${XDG_DATA_HOME:-$HOME/.local/share}/mime"
    fi

    echo "Installed DodaZIP context menu actions for Linux"
}

install_macos() {
    local wd="/tmp/dodazip-workflow"
    mkdir -p "$wd"

    cat > "$wd/CompressWithDodaZIP.applescript" << 'AS_EOF'
on run {input, parameters}
    set dodazipPath to "/usr/local/bin/dodazip"
    repeat with anItem in input
        set itemPath to POSIX path of anItem
        set outputPath to itemPath & ".dzip"
        do shell script dodazipPath & " compress -o " & quoted form of outputPath & " " & quoted form of itemPath
    end repeat
end run
AS_EOF

    echo "macOS Automator workflow template created at $wd"
    echo "Open Automator, create a new Service/Quick Action,"
    echo "add 'Run AppleScript', paste the contents, save as 'Compress with DodaZIP'"
}

case "$(uname -s)" in
    Linux*)  install_linux ;;
    Darwin*) install_macos ;;
    *)
        echo "Unsupported OS. Windows users: double-click install-context-menu.reg"
        exit 1
        ;;
esac
