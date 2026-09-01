# Simple Image Converter — Google Drive szinkron
# Futtatás: jobb klikk → "Run with PowerShell" (vagy PowerShell-ben)

$ErrorActionPreference = "Stop"

$DriveRoot = "G:\Saját meghajtó\OpzoziDev\ChromeExtensions"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$FreeSource = Join-Path $ScriptDir "Simple_Image_Converter_Free"
$ProDocsSource = Join-Path $ScriptDir "Simple_Image_Converter_PRO"
$LocalProSource = "C:\Users\SysAdm\Documents\_webpng"

$FreeDest = Join-Path $DriveRoot "Simple_Image_Converter_Free"
$ProDest = Join-Path $DriveRoot "Simple_Image_Converter_PRO"

if (-not (Test-Path $DriveRoot)) {
    Write-Host "HIBA: A Google Drive mappa nem elérhető: $DriveRoot" -ForegroundColor Red
    Write-Host "Ellenőrizd, hogy a Google Drive fut és a G: meghajtó csatlakoztatva van."
    exit 1
}

function Copy-Folder {
    param([string]$From, [string]$To, [string]$Label)
    if (-not (Test-Path $From)) {
        Write-Host "Kihagyva ($Label): nincs forrás — $From" -ForegroundColor Yellow
        return
    }
    Write-Host "Másolás: $Label -> $To"
    New-Item -ItemType Directory -Force -Path $To | Out-Null
    robocopy $From $To /MIR /XD node_modules .git dist /NFL /NDL /NJH /NJS /nc /ns /np
    if ($LASTEXITCODE -ge 8) { throw "Robocopy hiba ($Label): exit $LASTEXITCODE" }
}

Copy-Folder -From $FreeSource -To $FreeDest -Label "FREE 1.3.3"

if (Test-Path $LocalProSource) {
    Copy-Folder -From $LocalProSource -To $ProDest -Label "PRO 1.4.0 (helyi _webpng)"
} else {
    Write-Host "Helyi PRO nem található: $LocalProSource" -ForegroundColor Yellow
    Write-Host "Csak a PRO dokumentáció másolása..."
    Copy-Folder -From $ProDocsSource -To $ProDest -Label "PRO docs"
}

Write-Host ""
Write-Host "Kész!" -ForegroundColor Green
Write-Host "  FREE: $FreeDest"
Write-Host "  PRO:  $ProDest"
