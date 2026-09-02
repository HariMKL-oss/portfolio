@echo off
title Share LaTeX Resume Studio Online
cd /d "%~dp0"

echo =======================================================
echo    Sharing LaTeX Resume Studio Over the Internet
echo =======================================================
echo.
echo [1/2] Making sure local server is running on port 5050...
start "" "http://localhost:5050"
start "LaTeX Studio Server" /min cmd /c "node server.js"

echo.
echo [2/2] Generating instant secure public link for your friend...
echo.
echo -------------------------------------------------------
echo Send the public URL below to your friend:
echo -------------------------------------------------------
npx localtunnel --port 5050

pause
