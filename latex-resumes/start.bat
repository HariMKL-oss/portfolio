@echo off
title LaTeX Resume Studio - Overleaf-Style Compiler
cd /d "%~dp0"

echo ===================================================
echo     Launching LaTeX Resume Studio
echo ===================================================
echo.

:: Check if node_modules exists, install if missing
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies...
    call npm install
    echo [INFO] Dependencies installed successfully!
    echo.
)

:: Start node server in background and open browser
echo [INFO] Starting LaTeX Resume Studio Server on port 5050...
start "" http://localhost:5050
node server.js

pause
