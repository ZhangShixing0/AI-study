$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $Root ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $Python)) {
  throw "未找到 .venv 中的 Python，请先创建虚拟环境并安装 requirements.txt。"
}

$IPv4 = $null
try {
  $IPv4 = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    Select-Object -First 1 -ExpandProperty IPAddress
} catch {
  $IPv4 = (ipconfig | Select-String -Pattern "IPv4.*?:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)" |
    ForEach-Object { $_.Matches[0].Groups[1].Value } |
    Where-Object { $_ -notlike "127.*" -and $_ -notlike "169.254.*" } |
    Select-Object -First 1)
}

Write-Host ""
Write-Host "AI 督学本地预览服务即将启动" -ForegroundColor Cyan
Write-Host "电脑访问: http://127.0.0.1:8000"
if ($IPv4) {
  Write-Host "手机访问: http://$IPv4`:8000"
  Write-Host "请确认手机和电脑连接同一个 Wi-Fi。"
} else {
  Write-Host "未自动识别局域网 IP，可运行 ipconfig 查看 IPv4 地址。"
}
Write-Host ""

$SeedDatabase = Join-Path $Root "data\production-seed\math2_public_seed_v1.sqlite"
if (Test-Path -LiteralPath $SeedDatabase) {
  $env:PUBLIC_SEED_SQLITE_PATH = $SeedDatabase
} else {
  Remove-Item Env:PUBLIC_SEED_SQLITE_PATH -ErrorAction SilentlyContinue
}

Set-Location $Root
& $Python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
