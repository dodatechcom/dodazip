# ==============================================================================
# DodaZip Cloudflare R2 Upload Script
# ==============================================================================
param(
    [string]$SourceFile = "R2Bucket\latest.json",
    [string]$ObjectKey = "dodazip/latest.json",
    [string]$ContentType = "application/json",
    [string]$BucketName = "dodatech-updates"
)

$envFile = "C:\projects\My-Files\cloudflare.env"
if (-not (Test-Path $envFile)) {
    Write-Error "Could not find $envFile! Please ensure your Cloudflare credentials are saved."
    exit 1
}

# Load credentials
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

$token = $env:CLOUDFLARE_API_TOKEN
$accountId = $env:CLOUDFLARE_ACCOUNT_ID

if (-not $token -or -not $accountId) {
    Write-Error "Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID in $envFile"
    exit 1
}

if (-not (Test-Path $SourceFile)) {
    Write-Error "Source file not found: $SourceFile"
    exit 1
}

Write-Host "Uploading $SourceFile to R2 bucket '$BucketName' as '$ObjectKey'..." -ForegroundColor Cyan

$fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $SourceFile))

# Cloudflare R2 REST API Object PUT Endpoint
$uri = "https://api.cloudflare.com/client/v4/accounts/$accountId/r2/buckets/$BucketName/objects/$ObjectKey"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = $ContentType
}

try {
    $response = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $fileBytes
    if ($response.success) {
        Write-Host "Successfully uploaded $ObjectKey to Cloudflare R2!" -ForegroundColor Green
    } else {
        Write-Host "Cloudflare response:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 4
    }
} catch {
    Write-Host "Upload failed:" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    } else {
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    Write-Host "`nPlease ensure your Cloudflare API Token has the permission: Account -> Workers R2 Storage -> Edit" -ForegroundColor Yellow
}
