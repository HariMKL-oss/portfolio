@echo off
title Share LaTeX Resume Studio with Friend
cd /d "%~dp0"

:: Start local server in background if not already running
start "LaTeX Resume Studio Server" /min cmd /c "node server.js"

:: Start tunnel generator
node share-tunnel.js

pause
