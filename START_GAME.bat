@echo off
setlocal
cd /d "%~dp0"
title KUMESEVO - Steppe Prototype

echo.
echo   KUMESEVO - starting local server...
echo   Browser: http://localhost:8080
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080"
    py -m http.server 8080
    goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
    start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080"
    python -m http.server 8080
    goto :eof
)

echo Python not found.
echo Install Python from python.org and enable "Add Python to PATH".
pause
