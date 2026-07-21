@echo off
setlocal
cd /d "%~dp0"

echo Teacher assignment card tool
echo.
echo Preferred local address:
echo http://127.0.0.1:8093/
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:8093/"
  python -m http.server 8093 --bind 127.0.0.1
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:8093/"
  py -3 -m http.server 8093 --bind 127.0.0.1
  goto :eof
)

echo Python was not found. Opening index.html directly instead.
echo If image export has browser restrictions, install Python 3 and run this file again.
start "" "%~dp0index.html"
