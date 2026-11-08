# DodaZip Workspace Cleanup Utility for Windows (PowerShell)
# Reclaims disk space from build artifacts and intermediate caches.

param (
    [switch]$Sweep,
    [switch]$Deep
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "=== DodaZip Disk Cleanup Utility (Windows) ===" -ForegroundColor Cyan

if ($Sweep) {
    if (Get-Command cargo-sweep -ErrorAction SilentlyContinue) {
        Write-Host "→ Sweeping stale build artifacts (keeping only active build)..." -ForegroundColor Yellow
        cargo sweep --installed
        Write-Host "✓ Cargo sweep completed." -ForegroundColor Green
    } else {
        Write-Host "cargo-sweep is not installed." -ForegroundColor Yellow
        Write-Host "To install: cargo install cargo-sweep"
        Write-Host "Falling back to standard cargo clean..."
        cargo clean
        if (Test-Path "src-tauri\target") { Remove-Item -Recurse -Force "src-tauri\target" }
        if (Test-Path "ui\dist") { Remove-Item -Recurse -Force "ui\dist" }
        Write-Host "✓ Standard clean completed." -ForegroundColor Green
    }
} elseif ($Deep) {
    Write-Host "→ Performing deep clean (targets + dist + node_modules)..." -ForegroundColor Yellow
    cargo clean
    if (Test-Path "target") { Remove-Item -Recurse -Force "target" }
    if (Test-Path "src-tauri\target") { Remove-Item -Recurse -Force "src-tauri\target" }
    if (Test-Path "ui\dist") { Remove-Item -Recurse -Force "ui\dist" }
    if (Test-Path "ui\node_modules") { Remove-Item -Recurse -Force "ui\node_modules" }
    if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
    Write-Host "✓ Deep clean completed. All intermediate and generated files removed." -ForegroundColor Green
} else {
    Write-Host "→ Cleaning build targets and distribution artifacts..." -ForegroundColor Yellow
    cargo clean
    if (Test-Path "src-tauri\target") { Remove-Item -Recurse -Force "src-tauri\target" }
    if (Test-Path "ui\dist") { Remove-Item -Recurse -Force "ui\dist" }
    Write-Host "✓ Clean completed." -ForegroundColor Green
    Write-Host "Usage tips:"
    Write-Host "  .\scripts\clean.ps1         # Standard clean (target, dist)" -ForegroundColor Cyan
    Write-Host "  .\scripts\clean.ps1 -Sweep  # Keep latest build, remove stale intermediate objects" -ForegroundColor Cyan
    Write-Host "  .\scripts\clean.ps1 -Deep   # Deep clean including node_modules" -ForegroundColor Cyan
}
