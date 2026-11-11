#!/usr/bin/env bash
# ==============================================================================
# ApexRad Enterprise DICOM Web Viewer & PACS Gateway - Linux Server Deploy
# Compatible with Ubuntu 22.04 / 24.04 LTS, Debian 12, Rocky Linux 9, RHEL 9
# ==============================================================================
# Usage:
#   chmod +x deploy-linux.sh
#   sudo ./deploy-linux.sh

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}  ApexRad Enterprise DICOM Web Viewer - Linux Server Deploy     ${NC}"
echo -e "${CYAN}=================================================================${NC}"

# 1. Require Root Privileges
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (use sudo).${NC}" 
   exit 1
fi

# 2. Package Manager Detection & Prerequisites
echo -e "${YELLOW}[1/6] Installing system prerequisites...${NC}"
if command -v apt-get &>/dev/null; then
    apt-get update -y
    apt-get install -y curl build-essential nginx ufw dcmtk git
elif command -v dnf &>/dev/null; then
    dnf install -y curl make gcc-c++ nginx firewalld git dcmtk
fi

# 3. Verify or Install Node.js LTS 20+
if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    echo -e "${YELLOW}[2/6] Installing Node.js LTS via NodeSource...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    if command -v apt-get &>/dev/null; then
        apt-get install -y nodejs
    else
        dnf install -y nodejs
    fi
fi
echo -e "${GREEN}  + Node.js runtime: $(node -v)${NC}"

# 4. Setup Dedicated Healthcare Application User & Directory Structure
echo -e "${YELLOW}[3/6] Setting up application directories and service user...${NC}"
APP_USER="apexrad"
APP_DIR="/opt/apexrad"
DATA_DIR="/data/dicom_cache"
LOG_DIR="/var/log/apexrad"

if ! id -u "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$APP_DIR" "$APP_USER"
    echo -e "${GREEN}  + Created dedicated service user: $APP_USER${NC}"
fi

mkdir -p "$APP_DIR" "$DATA_DIR" "$LOG_DIR"

# Copy repository source code to target directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$SCRIPT_DIR" != "$APP_DIR" ]]; then
    cp -r "$SCRIPT_DIR"/* "$APP_DIR"/
fi

# 5. Build Application Assets
echo -e "${YELLOW}[4/6] Installing npm packages and compiling production bundle...${NC}"
cd "$APP_DIR"
npm ci --omit=dev
npm run build
chown -R "$APP_USER":"$APP_USER" "$APP_DIR" "$DATA_DIR" "$LOG_DIR"
echo -e "${GREEN}  + Assets built and permissions secured.${NC}"

# 6. Configure systemd Service Unit
echo -e "${YELLOW}[5/6] Registering systemd background daemon...${NC}"
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

# 7. Configure Firewall
echo -e "${YELLOW}[6/6] Configuring firewall security rules...${NC}"
if command -v ufw &>/dev/null; then
    ufw allow 80/tcp comment 'HTTP Web' || true
    ufw allow 443/tcp comment 'HTTPS DICOMweb' || true
    ufw allow 104/tcp comment 'Traditional DICOM DIMSE' || true
    ufw allow 4242/tcp comment 'Orthanc DICOM' || true
fi

# Wait and test health
sleep 3
if curl -sf http://localhost:3000/api/system/metrics &>/dev/null; then
    echo -e "${GREEN}=================================================================${NC}"
    echo -e "${GREEN}  Deployment SUCCESSFUL! ApexRad Gateway is running on port 3000. ${NC}"
    echo -e "${GREEN}  Service status: systemctl status apexrad                       ${NC}"
    echo -e "${GREEN}  Live logs: tail -f /var/log/apexrad/access.log                 ${NC}"
    echo -e "${GREEN}=================================================================${NC}"
else
    echo -e "${YELLOW}ApexRad service started. Check status with: systemctl status apexrad${NC}"
fi
