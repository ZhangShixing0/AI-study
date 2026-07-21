$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Dist = Join-Path $Root "dist"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Out = Join-Path $Dist "ai-tutor-deploy-$Stamp.zip"
$StudentFrontend = "prototypes\student-mobile-v3.3"
$AdminConsole = "prototypes\admin-teacher-console-v0.1"

New-Item -ItemType Directory -Force -Path $Dist | Out-Null

$includePaths = @(
  "backend",
  "data\production-seed",
  "data\samples",
  $StudentFrontend,
  $AdminConsole,
  "deploy",
  "scripts\validate-production-seed.mjs",
  "scripts\import-production-seed.mjs",
  "VERSION",
  "requirements.txt",
  ".env.production.example",
  ".deployignore",
  ".gitignore"
)

$excludedRelative = @(
  "backend\app.db"
)

$allowedRelative = @(
  "$StudentFrontend\data\experience-data.js"
)

$excludedPatterns = @(
  "$StudentFrontend\data\*",
  "$StudentFrontend\tests\*",
  "$StudentFrontend\_screenshots\*",
  "$AdminConsole\tests\*",
  "$AdminConsole\_screenshots\*",
  "data\production-seed\review\*",
  "*.inspect.ndjson"
)

$excludedFileNamePatterns = @(
  "*.db",
  "*.db-*",
  "*.db.*",
  "*.sqlite",
  "*.sqlite-*",
  "*.sqlite.*",
  "*.sqlite3",
  "*.sqlite3-*",
  "*.sqlite3.*"
)

$files = foreach ($includePath in $includePaths) {
  $absolute = Join-Path $Root $includePath
  if (-not (Test-Path -LiteralPath $absolute)) {
    continue
  }
  if ((Get-Item -LiteralPath $absolute).PSIsContainer) {
    if ($includePath -eq "data\samples") {
      Get-ChildItem -LiteralPath $absolute -Recurse -File | Where-Object { $_.Extension -eq ".xlsx" }
    } else {
      Get-ChildItem -LiteralPath $absolute -Recurse -File
    }
  } else {
    Get-Item -LiteralPath $absolute
  }
}

$files = $files | Where-Object {
  $relative = $_.FullName.Substring($Root.Path.Length + 1)
  if ($relative -in $allowedRelative) {
    return $true
  }
  if ($relative -in $excludedRelative) {
    return $false
  }
  foreach ($pattern in $excludedPatterns) {
    if ($relative -like $pattern) {
      return $false
    }
  }
  foreach ($pattern in $excludedFileNamePatterns) {
    if ($_.Name -like $pattern) {
      return $false
    }
  }
  if ($relative -like "*\__pycache__\*" -or $_.Extension -in @(".pyc", ".pyo", ".log", ".md")) {
    return $false
  }
  return $true
}

if (Test-Path -LiteralPath $Out) {
  Remove-Item -LiteralPath $Out -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($Out, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $files) {
    $relative = $file.FullName.Substring($Root.Path.Length + 1)
    $entryName = ($relative -replace "\\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $file.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zip.Dispose()
}

Write-Host "Deployment package created: $Out"
