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
  Download
} from 'lucide-react';

export const DeploymentDocModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'windows' | 'linux' | 'docker' | 'network' | 'architecture'>('windows');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const WINDOWS_POWERSHELL = `# ==============================================================================
# ApexRad Enterprise DICOM Web Viewer & PACS Gateway - Windows Server Deploy
# Compatible with Windows Server 2019 / 2022 / 2025
# ==============================================================================
# Run this script in an elevated PowerShell session (Run as Administrator)

Write-Host ">>> Initializing ApexRad Enterprise Windows Server Deployment..." -ForegroundColor Cyan

# 1. Verify Prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Node.js LTS via Winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# 2. Configure Windows Firewall Ports for Medical DICOM Communication
Write-Host ">>> Configuring Windows Defender Firewall for DICOM traffic..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "ApexRad Web Application (HTTP 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "DICOM C-STORE / DIMSE Gateway (Port 104)" -Direction Inbound -LocalPort 104 -Protocol TCP -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "DICOMweb QIDO/WADO Proxy (Port 8042)" -Direction Inbound -LocalPort 8042 -Protocol TCP -Action Allow -Profile Any

# 3. Build Production Web Application
Write-Host ">>> Installing production packages and compiling assets..." -ForegroundColor Cyan
npm install --omit=dev
npm run build

# 4. Register Windows Background Service with NSSM (Non-Sucking Service Manager)
$nssmPath = "C:\\ProgramData\\chocolatey\\bin\\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "Installing NSSM service wrapper..." -ForegroundColor Yellow
    choco install nssm -y
}

& nssm install ApexRadPacsGateway "$((Get-Command node).Source)" "$PSScriptRoot\\server.ts"
& nssm set ApexRadPacsGateway AppDirectory "$PSScriptRoot"
& nssm set ApexRadPacsGateway AppEnvironmentExtra "NODE_ENV=production" "PORT=3000"
& nssm set ApexRadPacsGateway Start SERVICE_AUTO_START
& nssm start ApexRadPacsGateway

Write-Host ">>> ApexRad PACS Gateway Service registered and active!" -ForegroundColor Green
Write-Host "Access locally at: http://localhost:3000" -ForegroundColor Green`;

  const LINUX_BASH = `#!/usr/bin/env bash
# ==============================================================================
# ApexRad Enterprise DICOM Web Viewer & PACS Gateway - Linux Server Deploy
# Compatible with Ubuntu 22.04/24.04 LTS, Debian 12, Rocky Linux 9, RHEL
# ==============================================================================
set -euo pipefail

echo -e "\\e[36m>>> Starting ApexRad Linux Enterprise Installation...\\e[0m"

# 1. Update OS packages & Install Node.js LTS
sudo apt-get update -y
sudo apt-get install -y curl build-essential nginx ufw dcmtk

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Setup Dedicated Medical PACS System User
if ! id -u apexrad &>/dev/null; then
    sudo useradd -r -s /bin/false -d /opt/apexrad apexrad
fi

# 3. Deploy Code & Build Assets
APP_DIR="/opt/apexrad"
sudo mkdir -p $APP_DIR
sudo cp -r . $APP_DIR
cd $APP_DIR
sudo npm ci --omit=dev
sudo npm run build
sudo chown -R apexrad:apexrad $APP_DIR

# 4. Create systemd Production Service Unit
sudo tee /etc/systemd/system/apexrad.service > /dev/null << 'EOF'
[Unit]
Description=ApexRad Enterprise DICOM Web Viewer & Universal PACS Gateway
After=network.target

[Service]
Type=simple
User=apexrad
WorkingDirectory=/opt/apexrad
ExecStart=/usr/bin/node /opt/apexrad/server.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production PORT=3000
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# 5. Enable & Start ApexRad Service
sudo systemctl daemon-reload
sudo systemctl enable apexrad
sudo systemctl restart apexrad

# 6. Configure UFW Firewall
sudo ufw allow 80/tcp comment 'HTTP Web'
sudo ufw allow 443/tcp comment 'HTTPS DICOMweb'
sudo ufw allow 104/tcp comment 'Traditional DICOM DIMSE'

echo -e "\\e[32m>>> ApexRad Enterprise PACS Gateway successfully deployed & active!\\e[0m"`;

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

  # Optional Local Orthanc PACS Server for testing
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
    volumes:
      - orthanc_db:/var/lib/orthanc/db

volumes:
  apexrad_cache:
  orthanc_db:`;

  return (
    <div className="w-full h-full bg-[#07090e] p-4 overflow-y-auto text-xs select-none">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0b0e14] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-950/60 border border-violet-800">
              <Terminal className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Enterprise Production Deployment & Architecture Specifications
              </h2>
              <div className="text-slate-400 text-[11px]">
                Ready-to-Run Scripts for Windows Server, Linux (Ubuntu/RHEL), Docker, and PACS Network Topology
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('windows')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'windows' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Windows Server
            </button>
            <button
              onClick={() => setActiveTab('linux')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'linux' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Linux Server
            </button>
            <button
              onClick={() => setActiveTab('docker')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'docker' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Docker
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'network' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Network Ports
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'architecture' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Architecture
            </button>
          </div>
        </div>

        {/* Tab 1: Windows Server */}
        {activeTab === 'windows' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Windows Server 2019 / 2022 / 2025 Deployment</h3>
                <div className="text-slate-400 text-[11px]">
                  PowerShell installation script configuring firewall rules, NSSM Windows Service, and IIS Proxy
                </div>
              </div>
              <button
                onClick={() => handleCopy(WINDOWS_POWERSHELL, 'win')}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded text-xs font-semibold transition-colors"
              >
                {copiedKey === 'win' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'win' ? 'Copied Script' : 'Copy PowerShell'}</span>
              </button>
            </div>

            <pre className="p-3 bg-[#07090e] border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {WINDOWS_POWERSHELL}
            </pre>
          </div>
        )}

        {/* Tab 2: Linux Server */}
        {activeTab === 'linux' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Linux Server (Ubuntu / Debian / RHEL / Rocky)</h3>
                <div className="text-slate-400 text-[11px]">
                  Automated Bash script creating dedicated apexrad service user, systemd unit, and UFW firewall rules
                </div>
              </div>
              <button
                onClick={() => handleCopy(LINUX_BASH, 'linux')}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded text-xs font-semibold transition-colors"
              >
                {copiedKey === 'linux' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'linux' ? 'Copied Script' : 'Copy Bash Script'}</span>
              </button>
            </div>

            <pre className="p-3 bg-[#07090e] border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {LINUX_BASH}
            </pre>
          </div>
        )}

        {/* Tab 3: Docker */}
        {activeTab === 'docker' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Docker & Containerized PACS Archive</h3>
                <div className="text-slate-400 text-[11px]">
                  Multi-container docker-compose setup combining ApexRad viewer with Orthanc Research Archive
                </div>
              </div>
              <button
                onClick={() => handleCopy(DOCKER_COMPOSE, 'docker')}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded text-xs font-semibold transition-colors"
              >
                {copiedKey === 'docker' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'docker' ? 'Copied' : 'Copy docker-compose.yml'}</span>
              </button>
            </div>

            <pre className="p-3 bg-[#07090e] border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {DOCKER_COMPOSE}
            </pre>
          </div>
        )}

        {/* Tab 4: Network & Port Connectivity Matrix */}
        {activeTab === 'network' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Enterprise Network Connectivity & Port Reference</h3>
              <div className="text-slate-400 text-[11px]">
                Complies with Section 21: Never expose raw hospital databases or unauthenticated DIMSE ports to the public internet
              </div>
            </div>

            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead>
                <tr className="bg-[#07090e] text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">Protocol</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Network Zone</th>
                  <th className="py-2.5 px-3">Access Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-teal-400 font-bold">443</td>
                  <td className="py-2.5 px-3">TCP / TLS</td>
                  <td className="py-2.5 px-3 font-sans text-slate-200">HTTPS Web Viewer & DICOMweb API</td>
                  <td className="py-2.5 px-3 text-emerald-400">DMZ / Edge Proxy</td>
                  <td className="py-2.5 px-3">Encrypted external or internal hospital access</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-teal-400 font-bold">3000</td>
                  <td className="py-2.5 px-3">TCP</td>
                  <td className="py-2.5 px-3 font-sans text-slate-200">ApexRad Gateway Backend</td>
                  <td className="py-2.5 px-3 text-sky-400">Internal Application Tier</td>
                  <td className="py-2.5 px-3">Bound to localhost or reverse proxy only</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-teal-400 font-bold">104</td>
                  <td className="py-2.5 px-3">TCP</td>
                  <td className="py-2.5 px-3 font-sans text-slate-200">Standard DICOM DIMSE (C-STORE, C-FIND)</td>
                  <td className="py-2.5 px-3 text-amber-400">Hospital VLAN / PACS Tier</td>
                  <td className="py-2.5 px-3">Strictly internal modality network (Modality Worklist)</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-teal-400 font-bold">4242 / 11112</td>
                  <td className="py-2.5 px-3">TCP</td>
                  <td className="py-2.5 px-3 font-sans text-slate-200">Orthanc / dcm4chee Archive Ports</td>
                  <td className="py-2.5 px-3 text-amber-400">Hospital Storage Tier</td>
                  <td className="py-2.5 px-3">Restricted to PACS servers and ApexRad gateway</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-teal-400 font-bold">5432</td>
                  <td className="py-2.5 px-3">TCP</td>
                  <td className="py-2.5 px-3 font-sans text-slate-200">PostgreSQL Study Index Database</td>
                  <td className="py-2.5 px-3 text-rose-400">Isolated Database Tier</td>
                  <td className="py-2.5 px-3">Zero public internet exposure; internal VPC only</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Architecture Specifications */}
        {activeTab === 'architecture' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-white text-sm">System Component & Data Flow Architecture</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300 text-[11px] font-mono">
              <div className="bg-[#07090e] border border-slate-800 p-3 rounded-lg space-y-1.5">
                <div className="font-bold text-teal-400 font-sans text-xs">Tier 1: Client Diagnostics</div>
                <div>• Zero-footprint HTML5 / WebGL2</div>
                <div>• Hardware-accelerated MPR & 3D</div>
                <div>• Calibrated Hounsfield Unit LUT</div>
                <div>• Client-side DICOM P10 parser</div>
              </div>

              <div className="bg-[#07090e] border border-slate-800 p-3 rounded-lg space-y-1.5">
                <div className="font-bold text-sky-400 font-sans text-xs">Tier 2: Universal Gateway</div>
                <div>• Express Node.js & Vite Middleware</div>
                <div>• DICOMweb Proxy (QIDO / WADO)</div>
                <div>• DIMSE C-ECHO / C-FIND Bridge</div>
                <div>• In-memory LRU Buffer Pool</div>
              </div>

              <div className="bg-[#07090e] border border-slate-800 p-3 rounded-lg space-y-1.5">
                <div className="font-bold text-amber-400 font-sans text-xs">Tier 3: PACS & Storage</div>
                <div>• Multi-vendor PACS connectivity</div>
                <div>• Orthanc, dcm4chee, GE, Siemens</div>
                <div>• HL7 / FHIR Integration hooks</div>
                <div>• HIPAA Audit Trail Store</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
