@echo off
taskkill /f /im msedge.exe >nul 2>&1
timeout /t 1 /nobreak >nul
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window "http://localhost:5173"
