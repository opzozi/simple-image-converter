# Simple Image Converter - Release Package Creator
# Creates a clean ZIP file ready for Chrome Web Store submission

$ErrorActionPreference = "Stop"

# Get version from manifest.json
$manifest = Get-Content -Path "manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$packageName = "simple-image-converter-v$version.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Simple Image Converter - Release Package" -ForegroundColor Cyan
Write-Host "Version: $version" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if output file already exists
if (Test-Path $packageName) {
    Write-Host "WARNING: Package file already exists: $packageName" -ForegroundColor Yellow
    $response = Read-Host "Overwrite? (y/n)"
    if ($response -ne "y") {
        Write-Host "Release cancelled." -ForegroundColor Red
        exit
    }
    Remove-Item $packageName
}

# Files and directories to include
$filesToInclude = @(
    "manifest.json",
    "background.js",
    "offscreen.html",
    "offscreen.js",
    "popup.html",
    "popup.css",
    "popup.js",
    "LICENSE",
    "PRIVACY.md",
    "README.md"
)

$dirsToInclude = @(
    "_locales",
    "icons"
)

Write-Host "Creating release package..." -ForegroundColor Yellow
Write-Host ""

# Verify all required files exist
$allFilesExist = $true
foreach ($file in $filesToInclude) {
    if (Test-Path $file) {
        Write-Host "[OK] $file" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

foreach ($dir in $dirsToInclude) {
    if (Test-Path $dir) {
        Write-Host "[OK] $dir/" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $dir/" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "ERROR: Some required files are missing. Cannot create package." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow

# Create temporary directory for packaging
$tempDir = "temp-release-$version"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files
foreach ($file in $filesToInclude) {
    Copy-Item $file -Destination $tempDir
}

# Copy directories
foreach ($dir in $dirsToInclude) {
    Copy-Item -Recurse $dir -Destination $tempDir
}

# Create ZIP
Compress-Archive -Path "$tempDir\*" -DestinationPath $packageName -CompressionLevel Optimal

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Package created successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "File: $packageName" -ForegroundColor White
$fileSize = (Get-Item $packageName).Length / 1KB
Write-Host "Size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test the extension one final time" -ForegroundColor White
Write-Host "  2. Go to Chrome Web Store Developer Dashboard" -ForegroundColor White
Write-Host "  3. Upload $packageName" -ForegroundColor White
Write-Host ""
