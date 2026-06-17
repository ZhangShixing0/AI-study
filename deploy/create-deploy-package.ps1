$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Dist = Join-Path $Root "dist"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Out = Join-Path $Dist "ai-tutor-deploy-$Stamp.zip"

New-Item -ItemType Directory -Force -Path $Dist | Out-Null

$excludedDirs = @(
  ".git",
  ".agents",
  ".codex",
  ".venv",
  "dist",
  "docs\superpowers",
  "__pycache__"
)

$excludedFiles = @(
  "backend\app.db"
)

$files = Get-ChildItem -LiteralPath $Root -Recurse -File | Where-Object {
  $relative = $_.FullName.Substring($Root.Path.Length + 1)
  foreach ($dir in $excludedDirs) {
    if ($relative -eq $dir -or $relative.StartsWith("$dir\")) {
      return $false
    }
    if ($relative -like "*\$dir\*") {
      return $false
    }
  }
  foreach ($file in $excludedFiles) {
    if ($relative -eq $file) {
      return $false
    }
  }
  if ($_.Extension -in @(".pyc", ".pyo", ".log")) {
    return $false
  }
  return $true
}

$temp = Join-Path $env:TEMP "ai-tutor-deploy-$Stamp"
if (Test-Path $temp) {
  Remove-Item -LiteralPath $temp -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $temp | Out-Null

foreach ($file in $files) {
  $relative = $file.FullName.Substring($Root.Path.Length + 1)
  $target = Join-Path $temp $relative
  New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $target
}

Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $Out -Force
Remove-Item -LiteralPath $temp -Recurse -Force

Write-Host "Deployment package created: $Out"
