@echo off
REM ==============================================================================
REM RADOX(r) Enterprise DICOM Web Viewer - Windows Double-Click Installer
REM Automatically bypasses PowerShell Execution Policy restrictions
REM ==============================================================================
TITLE RADOX Enterprise DICOM Viewer Installer
COLOR 0A

echo ==============================================================================
echo       RADOX(r) Enterprise DICOM Web Viewer - Windows Deployment Launcher
echo ==============================================================================
echo.
echo Launching automated deployment with ExecutionPolicy Bypass...
echo.

cd /d "%~dp0"

REM Check for Administrative rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative permissions required!
    echo Please right-click 'deploy-windows.bat' and select 'Run as administrator'.
    echo.
    pause
    exit /b 1
)

REM Execute PowerShell script with complete policy bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& { Unblock-File -Path '%~dp0deploy-windows.ps1' -ErrorAction SilentlyContinue; & '%~dp0deploy-windows.ps1' -Port 3000 -ServiceName 'RadoxPacsGateway' }"

if %errorLevel% equ 0 (
    echo.
    echo ==============================================================================
    echo [SUCCESS] RADOX(r) deployment completed successfully!
    echo You can now access the viewer at: http://localhost:3000/
    echo ==============================================================================
) else (
    echo.
    echo [WARNING] Deployment finished with exit code %errorLevel%.
)

echo.
pause
