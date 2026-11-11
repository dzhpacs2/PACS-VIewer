# ==============================================================================
# ApexRad Enterprise DICOM Web Viewer & PACS Gateway - Windows Server Deploy
# Compatible with Windows Server 2019 / 2022 / 2025
# ==============================================================================
# Usage: Open PowerShell as Administrator and run:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
#   .\deploy-windows.ps1
#
# OR run directly in one line without changing policy:
#   powershell.exe -ExecutionPolicy Bypass -File .\deploy-windows.ps1

[CmdletBinding()]
param (
    [string]$Port = "3000",
    [string]$ServiceName = "RadoxPacsGateway",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ApexRad Enterprise DICOM Web Viewer - Windows Server Deploy   " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Verify Administrative Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This deployment script MUST be executed within an elevated PowerShell session (Run as Administrator)."
}

# 2. Check and Install Node.js LTS if missing
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[1/5] Node.js not detected. Installing Node.js LTS via winget..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Error "Winget not found. Please install Node.js LTS 20+ manually from https://nodejs.org/"
    }
}
$nodeVersion = node -v
Write-Host "[1/5] Verified Node.js runtime: $nodeVersion" -ForegroundColor Green

# 3. Configure Windows Defender Firewall Rules
Write-Host "[2/5] Configuring Windows Defender Firewall for DICOM & Web traffic..." -ForegroundColor Yellow
$firewallRules = @(
    @{ Name = "ApexRad_Web_$Port"; DisplayName = "ApexRad Web Application (HTTP $Port)"; Port = $Port; Protocol = "TCP" },
    @{ Name = "ApexRad_DIMSE_104"; DisplayName = "DICOM DIMSE Protocol (Port 104)"; Port = "104"; Protocol = "TCP" },
    @{ Name = "ApexRad_Orthanc_4242"; DisplayName = "Orthanc DICOM Archive (Port 4242)"; Port = "4242"; Protocol = "TCP" },
    @{ Name = "ApexRad_DICOMweb_8042"; DisplayName = "Orthanc DICOMweb API (Port 8042)"; Port = "8042"; Protocol = "TCP" }
)

foreach ($rule in $firewallRules) {
    if (-not (Get-NetFirewallRule -Name $rule.Name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -Name $rule.Name -DisplayName $rule.DisplayName -Direction Inbound -LocalPort $rule.Port -Protocol $rule.Protocol -Action Allow -Profile Domain,Private -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  + Firewall rule created: $($rule.DisplayName)" -ForegroundColor DarkGray
    } else {
        Write-Host "  * Firewall rule already exists: $($rule.DisplayName)" -ForegroundColor DarkGray
    }
}

# 4. Install Dependencies & Build Production Bundle
if (-not $SkipBuild) {
    Write-Host "[3/5] Installing production npm packages and compiling bundle..." -ForegroundColor Yellow
    npm ci --omit=dev
    npm run build
    Write-Host "  + Application bundle compiled successfully." -ForegroundColor Green
} else {
    Write-Host "[3/5] Skipping build as requested." -ForegroundColor DarkGray
}

# 5. Service Configuration (NSSM Windows Service)
Write-Host "[4/5] Configuring Windows background service ($ServiceName)..." -ForegroundColor Yellow
$nssmExe = Get-Command nssm -ErrorAction SilentlyContinue

if (-not $nssmExe) {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nssm -y --limit-output
        $nssmExe = "C:\ProgramData\chocolatey\bin\nssm.exe"
    } else {
        Write-Host "  ! NSSM not found. Downloading standalone nssm.exe..." -ForegroundColor DarkYellow
        $downloadUrl = "https://nssm.cc/release/nssm-2.24.zip"
        $zipDest = "$PSScriptRoot\nssm.zip"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipDest
        Expand-Archive -Path $zipDest -DestinationPath "$PSScriptRoot\nssm_temp" -Force
        $nssmExe = "$PSScriptRoot\nssm_temp\nssm-2.24\win64\nssm.exe"
    }
}

# Stop and reinstall service if already registered
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Write-Host "  * Existing service detected. Stopping service..." -ForegroundColor DarkGray
    & $nssmExe stop $ServiceName | Out-Null
    & $nssmExe remove $ServiceName confirm | Out-Null
}

$nodePath = (Get-Command node).Source
& $nssmExe install $ServiceName "$nodePath" "$PSScriptRoot\server.ts"
& $nssmExe set $ServiceName AppDirectory "$PSScriptRoot"
& $nssmExe set $ServiceName AppEnvironmentExtra "NODE_ENV=production" "PORT=$Port"
& $nssmExe set $ServiceName Start SERVICE_AUTO_START
& $nssmExe set $ServiceName AppRestartDelay 5000
& $nssmExe start $ServiceName

# 6. Verify Deployment Health
Write-Host "[5/5] Verifying service responsiveness..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $response = Invoke-RestMethod -Uri "http://localhost:$Port/api/system/metrics" -TimeoutSec 10
    if ($response.success) {
        Write-Host "=================================================================" -ForegroundColor Green
        Write-Host "  Deployment SUCCESSFUL! ApexRad Gateway is healthy & running.   " -ForegroundColor Green
        Write-Host "  Local Web URL: http://localhost:$Port/                        " -ForegroundColor Green
        Write-Host "  Active PACS Connections: $($response.activePacsConnections)   " -ForegroundColor Green
        Write-Host "=================================================================" -ForegroundColor Green
    }
} catch {
    Write-Host "  Service started. Verify log output in Event Viewer or http://localhost:$Port" -ForegroundColor Yellow
}
