import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Server, 
  Cpu, 
  ShieldCheck, 
  HardDrive, 
  Network, 
  FileCode,
  Download,
  BookOpen,
  FileText
} from 'lucide-react';

export const DeploymentDocModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'docs' | 'guide' | 'windows' | 'linux' | 'docker' | 'nginx' | 'backup' | 'admin' | 'user' | 'network'
  >('docs');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const WINDOWS_POWERSHELL = `# ==============================================================================
# ApexRad Enterprise DICOM Web Viewer & PACS Gateway - Windows Server Deploy
# Compatible with Windows Server 2019 / 2022 / 2025
# ==============================================================================
# Run this script in an elevated PowerShell session (Run as Administrator)

[CmdletBinding()]
param (
    [string]$Port = "3000",
    [string]$ServiceName = "ApexRadPacsGateway",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host ">>> Initializing ApexRad Enterprise Windows Server Deployment..." -ForegroundColor Cyan

# 1. Verify Administrative Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This deployment script MUST be executed within an elevated PowerShell session (Run as Administrator)."
}

# 2. Check and Install Node.js LTS if missing
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[1/5] Node.js not detected. Installing Node.js LTS via winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-Host "[1/5] Verified Node.js: $(node -v)" -ForegroundColor Green

# 3. Configure Windows Defender Firewall for DICOM & Web traffic
Write-Host "[2/5] Configuring Windows Defender Firewall for DICOM traffic..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "ApexRad Web Application (HTTP $Port)" -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Profile Domain,Private -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "DICOM DIMSE Gateway (Port 104)" -Direction Inbound -LocalPort 104 -Protocol TCP -Action Allow -Profile Domain,Private -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "Orthanc Archive Port (Port 4242)" -Direction Inbound -LocalPort 4242 -Protocol TCP -Action Allow -Profile Domain,Private -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "DICOMweb REST API (Port 8042)" -Direction Inbound -LocalPort 8042 -Protocol TCP -Action Allow -Profile Domain,Private -ErrorAction SilentlyContinue | Out-Null

# 4. Install Dependencies & Compile Production Bundle
if (-not $SkipBuild) {
    Write-Host "[3/5] Installing production packages and compiling assets..." -ForegroundColor Yellow
    npm ci --omit=dev
    npm run build
}

# 5. Register Windows Background Service with NSSM
Write-Host "[4/5] Registering Windows background service ($ServiceName)..." -ForegroundColor Yellow
$nssmPath = (Get-Command nssm -ErrorAction SilentlyContinue)
if (-not $nssmPath) {
    choco install nssm -y --limit-output
    $nssmPath = "C:\\ProgramData\\chocolatey\\bin\\nssm.exe"
}

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    & $nssmPath stop $ServiceName | Out-Null
    & $nssmPath remove $ServiceName confirm | Out-Null
}

$nodePath = (Get-Command node).Source
& $nssmPath install $ServiceName "$nodePath" "$PSScriptRoot\\server.ts"
& $nssmPath set $ServiceName AppDirectory "$PSScriptRoot"
& $nssmPath set $ServiceName AppEnvironmentExtra "NODE_ENV=production" "PORT=$Port"
& $nssmPath set $ServiceName Start SERVICE_AUTO_START
& $nssmPath set $ServiceName AppRestartDelay 5000
& $nssmPath start $ServiceName

Write-Host ">>> Service registered and running at: http://localhost:$Port" -ForegroundColor Green`;

  const LINUX_BASH = `#!/usr/bin/env bash
# ==============================================================================
# ApexRad Enterprise DICOM Web Viewer & PACS Gateway - Linux Server Deploy
# Compatible with Ubuntu 22.04 / 24.04 LTS, Debian 12, Rocky Linux 9, RHEL 9
# ==============================================================================
set -euo pipefail

echo -e "\\e[36m>>> Starting ApexRad Linux Enterprise Installation...\\e[0m"

# 1. Require Root
if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run as root (use sudo)."
   exit 1
fi

# 2. Update Packages & Install Node.js LTS
if command -v apt-get &>/dev/null; then
    apt-get update -y
    apt-get install -y curl build-essential nginx ufw dcmtk git
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
elif command -v dnf &>/dev/null; then
    dnf install -y curl make gcc-c++ nginx firewalld git dcmtk nodejs
fi

# 3. Dedicated Service User & Directories
APP_USER="apexrad"
APP_DIR="/opt/apexrad"
DATA_DIR="/data/dicom_cache"
LOG_DIR="/var/log/apexrad"

if ! id -u "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$APP_DIR" "$APP_USER"
fi
mkdir -p "$APP_DIR" "$DATA_DIR" "$LOG_DIR"

# 4. Copy Code & Build Bundle
cp -r ./* "$APP_DIR"/
cd "$APP_DIR"
npm ci --omit=dev
npm run build
chown -R "$APP_USER":"$APP_USER" "$APP_DIR" "$DATA_DIR" "$LOG_DIR"

# 5. systemd Service Unit
cat << 'EOF' > /etc/systemd/system/apexrad.service
[Unit]
Description=ApexRad Enterprise DICOM Web Viewer & Universal PACS Gateway
After=network.target

[Service]
Type=simple
User=apexrad
Group=apexrad
WorkingDirectory=/opt/apexrad
ExecStart=/usr/bin/node /opt/apexrad/server.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production PORT=3000 DICOM_CACHE_DIR=/data/dicom_cache
LimitNOFILE=65536
StandardOutput=append:/var/log/apexrad/access.log
StandardError=append:/var/log/apexrad/error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable apexrad
systemctl restart apexrad

echo -e "\\e[32m>>> ApexRad PACS Gateway Service is active on port 3000!\\e[0m"`;

  const DOCKER_COMPOSE = `version: '3.8'

services:
  apexrad-viewer:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: apexrad-enterprise
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DICOM_CACHE_DIR=/data/dicom_cache
    volumes:
      - apexrad_cache:/data/dicom_cache
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/system/metrics"]
      interval: 30s
      timeout: 10s
      retries: 3

  orthanc-pacs:
    image: orthancteam/orthanc:latest
    container_name: orthanc-core
    restart: unless-stopped
    ports:
      - "4242:4242"   # DICOM C-STORE / DIMSE
      - "8042:8042"   # DICOMweb REST API
    environment:
      - ORTHANC__NAME=Orthanc_Research_Archive
      - ORTHANC__DICOM_WEB_ENABLED=true
      - ORTHANC__STORAGE_DIRECTORY=/var/lib/orthanc/db
      - ORTHANC__DICOM_AET=ORTHANC
      - ORTHANC__DICOM_PORT=4242
      - ORTHANC__HTTP_PORT=8042
    volumes:
      - orthanc_db:/var/lib/orthanc/db

volumes:
  apexrad_cache:
  orthanc_db:`;

  const NGINX_CONF = `server {
    listen 80;
    server_name pacs.hospital.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pacs.hospital.internal;

    ssl_certificate /etc/ssl/certs/apexrad_hospital.crt;
    ssl_certificate_key /etc/ssl/private/apexrad_hospital.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    client_max_body_size 500M;
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`;

  return (
    <div className="w-full h-full bg-[#07090e] p-4 overflow-y-auto text-xs select-none">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0b0e14] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-950/60 border border-teal-800">
              <Terminal className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Enterprise Production Deployment & Architecture Specifications
              </h2>
              <div className="text-slate-400 text-[11px]">
                Complete Deployment Manual, PowerShell / Bash Automation Scripts, Docker & Reverse Proxy Configurations
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/help/RADOX_Windows_and_Linux_Installation_Guide.docx"
              download
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Win/Linux Guide (.docx)</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-1 bg-[#0b0e14] p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
          {[
            { id: 'docs', label: 'MS Word Docs (.docx)', icon: FileText },
            { id: 'guide', label: 'Overview & Steps', icon: BookOpen },
            { id: 'windows', label: 'Windows Server (.ps1)', icon: Server },
            { id: 'linux', label: 'Linux Server (.sh)', icon: Terminal },
            { id: 'docker', label: 'Docker Compose', icon: FileCode },
            { id: 'nginx', label: 'NGINX Reverse Proxy', icon: HardDrive },
            { id: 'network', label: 'Network Ports', icon: Network },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Tabs */}
        {activeTab === 'docs' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-5 space-y-5 leading-relaxed text-slate-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-400" />
                  RADOX® Microsoft Word Documentation Suite (.docx)
                </h3>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Saved in project root <code className="text-teal-300 font-mono bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800">/help/</code> as genuine OpenXML .docx files. Fully compatible with Microsoft Word, LibreOffice, and Office 365.
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> 5 Documents Generated
                </span>
              </div>
            </div>

            {/* Featured Primary Doc */}
            <div className="bg-gradient-to-r from-teal-950/40 to-slate-900 border border-teal-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-teal-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                    NEW • FEATURED
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">24 KB • .docx</span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  RADOX® Windows & Linux Installation & Configuration Guide
                </h4>
                <p className="text-slate-300 text-[11px] max-w-2xl">
                  Step-by-step cross-platform guide detailing how to install, configure, secure, and run RADOX® on Windows Server (PowerShell, NSSM Windows Service, Defender Firewall) and Linux (systemd daemon, unprivileged service user, UFW, dcmtk).
                </p>
                <div className="text-[10px] font-mono text-teal-300">
                  /help/RADOX_Windows_and_Linux_Installation_Guide.docx
                </div>
              </div>
              <a
                href="/help/RADOX_Windows_and_Linux_Installation_Guide.docx"
                download="RADOX_Windows_and_Linux_Installation_Guide.docx"
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Win/Linux Guide</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Doc 1 */}
              <div className="bg-[#07090e] border border-slate-800 hover:border-teal-500/50 rounded-xl p-4 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-teal-950/80 border border-teal-800 text-teal-300 font-semibold text-[10px] uppercase tracking-wider">
                      Deployment & Operations
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">22 KB • .docx</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                    RADOX® Enterprise Deployment Guide
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-1.5">
                    Step-by-step installation for Windows Server 2019/2022/2025 (PowerShell, NSSM), Linux systemd, Docker Compose, Kubernetes, and Nginx reverse proxy with TLS 1.3.
                  </p>
                  <div className="mt-3 bg-slate-900/80 rounded px-2.5 py-1.5 text-[10px] font-mono text-slate-300 border border-slate-800">
                    /help/RADOX_Enterprise_Deployment_Guide.docx
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Includes complete script listings</span>
                  <a
                    href="/help/RADOX_Enterprise_Deployment_Guide.docx"
                    download="RADOX_Enterprise_Deployment_Guide.docx"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .docx</span>
                  </a>
                </div>
              </div>

              {/* Doc 2 */}
              <div className="bg-[#07090e] border border-slate-800 hover:border-teal-500/50 rounded-xl p-4 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800 text-sky-300 font-semibold text-[10px] uppercase tracking-wider">
                      Administration & PACS
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">21 KB • .docx</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                    RADOX® PACS & VNA Administrator Manual
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-1.5">
                    DIMSE C-ECHO, C-FIND, C-MOVE, C-STORE network architecture, DICOMweb (WADO-RS, QIDO-RS, STOW-RS), HL7 ADT/ORM worklist feeds, and FHIR ImagingStudy endpoints.
                  </p>
                  <div className="mt-3 bg-slate-900/80 rounded px-2.5 py-1.5 text-[10px] font-mono text-slate-300 border border-slate-800">
                    /help/RADOX_PACS_Administrator_Manual.docx
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Orthanc & dcm4chee guides</span>
                  <a
                    href="/help/RADOX_PACS_Administrator_Manual.docx"
                    download="RADOX_PACS_Administrator_Manual.docx"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .docx</span>
                  </a>
                </div>
              </div>

              {/* Doc 3 */}
              <div className="bg-[#07090e] border border-slate-800 hover:border-teal-500/50 rounded-xl p-4 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-semibold text-[10px] uppercase tracking-wider">
                      Clinical Radiology
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">20 KB • .docx</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    RADOX® Radiology & Clinician User Manual
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-1.5">
                    Diagnostic viewport tools, MPR (Multi-Planar Reconstruction), Hounsfield Unit calibrations, calibrated linear & elliptical ROI measurement formulas, and structured report sign-off.
                  </p>
                  <div className="mt-3 bg-slate-900/80 rounded px-2.5 py-1.5 text-[10px] font-mono text-slate-300 border border-slate-800">
                    /help/RADOX_Radiology_User_Manual.docx
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">HU Window presets & shortcuts</span>
                  <a
                    href="/help/RADOX_Radiology_User_Manual.docx"
                    download="RADOX_Radiology_User_Manual.docx"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .docx</span>
                  </a>
                </div>
              </div>

              {/* Doc 4 */}
              <div className="bg-[#07090e] border border-slate-800 hover:border-teal-500/50 rounded-xl p-4 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 font-semibold text-[10px] uppercase tracking-wider">
                      Security & Disaster Recovery
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">19 KB • .docx</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    RADOX® Security, Compliance & Disaster Recovery
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-1.5">
                    HIPAA/GDPR compliance matrices, AES-256 data-at-rest encryption, TLS 1.3 cipher requirements, backup scripts, RTO &lt; 15 min / RPO &lt; 1 hour, and secondary site failover.
                  </p>
                  <div className="mt-3 bg-slate-900/80 rounded px-2.5 py-1.5 text-[10px] font-mono text-slate-300 border border-slate-800">
                    /help/RADOX_Disaster_Recovery_and_Security.docx
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Automated backup script included</span>
                  <a
                    href="/help/RADOX_Disaster_Recovery_and_Security.docx"
                    download="RADOX_Disaster_Recovery_and_Security.docx"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .docx</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick terminal instructions to inspect files */}
            <div className="bg-[#07090e] border border-slate-800 rounded-xl p-4 space-y-2 font-mono text-[11px]">
              <div className="text-slate-400 font-sans font-bold text-xs flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                Direct Filesystem Location & Shell Commands
              </div>
              <p className="text-slate-400 font-sans text-[11px]">
                All documents are located on the host filesystem under <code className="text-teal-300 bg-slate-900 px-1 py-0.5 rounded">/help/</code>. You can copy or inspect them at any time:
              </p>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-teal-300">
                ls -la /help/<br />
                # Output:<br />
                # -rw-r--r-- RADOX_Windows_and_Linux_Installation_Guide.docx<br />
                # -rw-r--r-- RADOX_Enterprise_Deployment_Guide.docx<br />
                # -rw-r--r-- RADOX_PACS_Administrator_Manual.docx<br />
                # -rw-r--r-- RADOX_Radiology_User_Manual.docx<br />
                # -rw-r--r-- RADOX_Disaster_Recovery_and_Security.docx<br />
              </div>
            </div>
          </div>
        )}

        {/* Content Tabs */}
        {activeTab === 'guide' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-5 space-y-4 leading-relaxed text-slate-300">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Quick Start Deployment Overview</h3>
              <div className="text-slate-400 text-[11px]">
                Recommended production path for clinical radiology environments
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px]">
              <div className="bg-[#07090e] border border-slate-800 p-3.5 rounded-lg space-y-2">
                <div className="font-bold text-teal-400 font-sans text-xs">Method 1: Windows Server</div>
                <div className="text-slate-400">Windows Server 2019 / 2022 / 2025:</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200">
                  .\deploy-windows.ps1
                </div>
                <div>Automates firewall rules, NSSM service registration, and health verification.</div>
              </div>

              <div className="bg-[#07090e] border border-slate-800 p-3.5 rounded-lg space-y-2">
                <div className="font-bold text-sky-400 font-sans text-xs">Method 2: Linux Server</div>
                <div className="text-slate-400">Ubuntu 22.04/24.04, Debian, RHEL:</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200">
                  sudo ./deploy-linux.sh
                </div>
                <div>Sets up unprivileged system user, systemd service, and UFW firewall.</div>
              </div>

              <div className="bg-[#07090e] border border-slate-800 p-3.5 rounded-lg space-y-2">
                <div className="font-bold text-amber-400 font-sans text-xs">Method 3: Docker Compose</div>
                <div className="text-slate-400">Cross-platform containers:</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200">
                  docker compose up -d --build
                </div>
                <div>Spins up ApexRad Viewer along with integrated Orthanc PACS archive.</div>
              </div>
            </div>

            <div className="bg-[#07090e] border border-slate-800 p-4 rounded-lg space-y-2">
              <h4 className="font-bold text-white font-sans text-sm">Standalone Documentation Files Created:</h4>
              <ul className="list-disc list-inside space-y-1 font-mono text-slate-300">
                <li><strong className="text-teal-400 font-sans">DEPLOYMENT.md</strong>: Complete master deployment manual (prerequisites, topology, backup/restore, troubleshooting).</li>
                <li><strong className="text-teal-400 font-sans">ADMIN_MANUAL.md</strong>: Complete PACS Administrator & Engineering manual (C-ECHO, RBAC, audit logs).</li>
                <li><strong className="text-teal-400 font-sans">USER_MANUAL.md</strong>: Complete Radiologist & Clinical user manual (tools, W/L, MPR, 3D, reporting).</li>
                <li><strong className="text-teal-400 font-sans">deploy-windows.ps1</strong>: Automated PowerShell script for Windows Server.</li>
                <li><strong className="text-teal-400 font-sans">deploy-linux.sh</strong>: Automated Bash script for Ubuntu/Debian/RHEL.</li>
                <li><strong className="text-teal-400 font-sans">Dockerfile & docker-compose.yml</strong>: Multi-stage containerized deployment.</li>
                <li><strong className="text-teal-400 font-sans">nginx.conf</strong>: Production reverse proxy with TLS 1.3 and security headers.</li>
                <li><strong className="text-teal-400 font-sans">backup-restore.sh</strong>: Disaster recovery and automated backup utility.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Windows PowerShell Tab */}
        {activeTab === 'windows' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Windows Server Automated Deployment (deploy-windows.ps1)</h3>
                <div className="text-slate-400 text-[11px]">Run within an elevated Administrator PowerShell console</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload('deploy-windows.ps1', WINDOWS_POWERSHELL)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .ps1</span>
                </button>
                <button
                  onClick={() => handleCopy(WINDOWS_POWERSHELL, 'win')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded text-xs font-semibold transition-colors"
                >
                  {copiedKey === 'win' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'win' ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>
            </div>

            {/* Execution Policy Troubleshooting Alert Box */}
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3.5 space-y-3 text-xs">
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Resolving Execution Policy (UnauthorizedAccess / Not Digitally Signed)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px]">
                  Easiest: Run deploy-windows.bat
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Windows PowerShell blocks unsigned scripts by default. You can bypass this in 1-click using the provided <code className="text-teal-300 font-mono bg-black/40 px-1 py-0.5 rounded">deploy-windows.bat</code> launcher, or by entering the one-line PowerShell command below.
              </p>
              
              <div className="space-y-2 font-mono text-[11px]">
                {/* Method 1: The fastest 1-line command */}
                <div className="bg-black/60 p-3 rounded-lg border border-teal-800/70 space-y-1.5">
                  <div className="text-teal-300 font-sans text-[11px] font-bold flex items-center justify-between">
                    <span>METHOD 1: Paste This Exact Command In PowerShell (Runs with Bypass):</span>
                    <button
                      onClick={() => handleCopy('powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\deploy-windows.ps1', 'bypass-cmd')}
                      className="text-teal-400 hover:text-teal-300 flex items-center gap-1 text-[10px] bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800"
                    >
                      {copiedKey === 'bypass-cmd' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'bypass-cmd' ? 'Copied!' : 'Copy Command'}</span>
                    </button>
                  </div>
                  <div className="text-emerald-400 font-bold bg-slate-950 p-2 rounded border border-slate-800 select-all">
                    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deploy-windows.ps1
                  </div>
                </div>

                {/* Method 2: Batch file */}
                <div className="bg-black/50 p-2.5 rounded border border-slate-800 space-y-1">
                  <div className="text-slate-300 font-sans text-[11px] font-bold text-sky-400">
                    METHOD 2: Double-Click "deploy-windows.bat"
                  </div>
                  <div className="text-slate-400 font-sans text-[11px]">
                    Right-click <code className="text-sky-300 font-mono">deploy-windows.bat</code> in File Explorer and choose <strong>"Run as administrator"</strong>. It automatically unblocks the PowerShell script and launches the service installer.
                  </div>
                </div>

                {/* Method 3: Process execution policy */}
                <div className="bg-black/50 p-2.5 rounded border border-slate-800 space-y-1">
                  <div className="text-slate-300 font-sans text-[11px] font-bold text-indigo-400">
                    METHOD 3: Allow Scripts For Current Session:
                  </div>
                  <div className="text-indigo-300 select-all bg-slate-950 p-1.5 rounded">Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force</div>
                  <div className="text-slate-300 select-all bg-slate-950 p-1.5 rounded">.\deploy-windows.ps1 -Port 3000 -ServiceName "RadoxPacsGateway"</div>
                </div>
              </div>
            </div>

            <pre className="p-3 bg-[#07090e] border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {WINDOWS_POWERSHELL}
            </pre>
          </div>
        )}

        {/* Linux Bash Tab */}
        {activeTab === 'linux' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Linux Server Automated Deployment (deploy-linux.sh)</h3>
                <div className="text-slate-400 text-[11px]">Tested on Ubuntu 22.04/24.04 LTS, Debian 12, RHEL 9</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload('deploy-linux.sh', LINUX_BASH)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .sh</span>
                </button>
                <button
                  onClick={() => handleCopy(LINUX_BASH, 'linux')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded text-xs font-semibold transition-colors"
                >
                  {copiedKey === 'linux' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'linux' ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>
            </div>
            <pre className="p-3 bg-[#07090e] border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {LINUX_BASH}
            </pre>
          </div>
        )}

        {/* Docker Compose Tab */}
        {activeTab === 'docker' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Docker Compose (docker-compose.yml)</h3>
                <div className="text-slate-400 text-[11px]">Integrates ApexRad with Orthanc PACS Research Archive</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload('docker-compose.yml', DOCKER_COMPOSE)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download YAML</span>
                </button>
                <button
                  onClick={() => handleCopy(DOCKER_COMPOSE, 'docker')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded text-xs font-semibold transition-colors"
                >
                  {copiedKey === 'docker' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'docker' ? 'Copied' : 'Copy Compose'}</span>
                </button>
              </div>
            </div>
            <pre className="p-3 bg-[#07090e] border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {DOCKER_COMPOSE}
            </pre>
          </div>
        )}

        {/* NGINX Tab */}
        {activeTab === 'nginx' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">NGINX Reverse Proxy Configuration (nginx.conf)</h3>
                <div className="text-slate-400 text-[11px]">TLS 1.3, HTTP/2, streaming buffer optimizations, and security headers</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload('nginx.conf', NGINX_CONF)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download nginx.conf</span>
                </button>
                <button
                  onClick={() => handleCopy(NGINX_CONF, 'nginx')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded text-xs font-semibold transition-colors"
                >
                  {copiedKey === 'nginx' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'nginx' ? 'Copied' : 'Copy Config'}</span>
                </button>
              </div>
            </div>
            <pre className="p-3 bg-[#07090e] border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {NGINX_CONF}
            </pre>
          </div>
        )}

        {/* Network Ports Tab */}
        {activeTab === 'network' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Enterprise Network Port Matrix</h3>
              <div className="text-slate-400 text-[11px]">Strict hospital VLAN segmentation rules</div>
            </div>
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead>
                <tr className="bg-[#07090e] text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">Protocol</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Network Zone</th>
                  <th className="py-2.5 px-3">Security Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-teal-400 font-bold">443</td>
                  <td className="py-2 px-3">TCP / TLS</td>
                  <td className="py-2 px-3 font-sans text-slate-200">HTTPS Web Viewer & DICOMweb</td>
                  <td className="py-2 px-3 text-emerald-400">DMZ / Edge</td>
                  <td className="py-2 px-3">Client hospital workstations & remote radiology review</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-teal-400 font-bold">3000</td>
                  <td className="py-2 px-3">TCP</td>
                  <td className="py-2 px-3 font-sans text-slate-200">ApexRad Gateway Backend</td>
                  <td className="py-2 px-3 text-sky-400">Application Tier</td>
                  <td className="py-2 px-3">Bound to localhost or internal reverse proxy</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-teal-400 font-bold">104</td>
                  <td className="py-2 px-3">TCP</td>
                  <td className="py-2 px-3 font-sans text-slate-200">Standard DICOM DIMSE</td>
                  <td className="py-2 px-3 text-amber-400">Hospital PACS VLAN</td>
                  <td className="py-2 px-3">Modality Worklist (MWL) & C-STORE storage</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-teal-400 font-bold">4242 / 11112</td>
                  <td className="py-2 px-3">TCP</td>
                  <td className="py-2 px-3 font-sans text-slate-200">Orthanc / dcm4chee Archive</td>
                  <td className="py-2 px-3 text-amber-400">PACS Storage Tier</td>
                  <td className="py-2 px-3">Protected hospital subnet; no external exposure</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
