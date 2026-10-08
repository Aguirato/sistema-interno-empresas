@echo off
powershell.exe -NoProfile -File "%~dp0PARAR.ps1"
if errorlevel 1 pause
