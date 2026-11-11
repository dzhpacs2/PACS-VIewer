# Enterprise Production Deployment & Infrastructure Guide
## ApexRad Web-Based DICOM Viewer & Universal PACS Integration Platform

This document is the definitive master deployment manual for deploying **ApexRad** into production healthcare environments, including on-premises hospital data centers, private cloud VPCs, and hybrid clinical networks.

---

## 1. System Architecture & Prerequisites

ApexRad is architected as a modular, three-tier enterprise healthcare platform:

1. **Client Tier**: Zero-footprint, modern browser interface running on desktop workstations (radiologist diagnostic consoles, clinical review stations, operating room touch displays). Utilizes WebGL2 and Web Workers for real-time 2D, 3D volume rendering, and Multiplanar Reconstruction (MPR).
2. **Gateway Tier (Node.js/Express)**: Server-side universal PACS bridge handling DICOMweb (QIDO-RS, WADO-RS, STOW-RS), traditional DICOM DIMSE networking (C-ECHO, C-FIND, C-MOVE), session authentication, and HIPAA/GDPR audit logging.
3. **PACS & Storage Tier**: Integration with existing hospital PACS archives (Orthanc, dcm4chee, GE Healthcare Centricity, Philips IntelliSpace, Siemens syngo.plaza, Sectra, Conquest, etc.).

### Minimum Hardware Specifications

| Component | Minimum Specification | Recommended Production Spec | High-Throughput Hospital |
|---|---|---|---|
| **CPU** | 4 Cores (2.4 GHz) | 8 Cores (3.0 GHz+) | 16+ Cores |
| **RAM** | 8 GB | 16 GB - 32 GB | 64 GB+ |
| **Storage (OS & App)** | 50 GB SSD | 100 GB NVMe SSD | 250 GB Enterprise NVMe |
| **Storage (DICOM Cache)** | 100 GB SSD | 500 GB - 1 TB SSD | 2 TB+ SSD Array (RAID 10) |
| **Network Interface** | 1 Gbps Ethernet | 1 Gbps Full-Duplex | 10 Gbps Redundant SFP+ |

---

## 2. Network Topology & Port Configuration

Per healthcare privacy and cybersecurity regulations (HIPAA, HITRUST, SOC 2, ISO 27001), **never expose internal databases or unrestricted DICOM services to the public internet**.

### Network Port Connectivity Matrix

| Port | Protocol | Direction | Source Network | Destination Network | Description |
|---|---|---|---|---|---|
| **443** | TCP / TLS | Inbound | Client Workstations | Edge Reverse Proxy (NGINX/IIS) | HTTPS Web Viewer & DICOMweb API |
| **80** | TCP | Inbound | Client Workstations | Edge Reverse Proxy | HTTP (redirects immediately to 443) |
| **3000** | TCP | Internal | Edge Reverse Proxy | ApexRad Gateway Service | Node.js Application Service |
| **104** | TCP | Bidirectional | ApexRad Gateway | Hospital PACS Archive | Standard DICOM DIMSE (C-ECHO, C-STORE, C-FIND) |
| **4242** | TCP | Bidirectional | ApexRad Gateway | Orthanc PACS Archive | Traditional DICOM Port (Orthanc) |
| **8042** | TCP | Bidirectional | ApexRad Gateway | Orthanc PACS Archive | DICOMweb REST API (Orthanc) |
| **11112**| TCP | Bidirectional | ApexRad Gateway | dcm4chee Archive | Standard dcm4chee DICOM DIMSE Port |
| **5432** | TCP | Internal | ApexRad Gateway | PostgreSQL Database | Application Metadata & Audit Store |

---

## 3. Windows Server Deployment (2019 / 2022 / 2025)

### Option A: Automated PowerShell Deployment Script

Run PowerShell as an **Administrator** and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\deploy-windows.ps1
```

### Option B: Step-by-Step Manual Windows Installation

#### Step 1: Install Runtimes & Dependencies
1. Install **Node.js LTS** (version 20.x or 22.x) from [https://nodejs.org/](https://nodejs.org/) or via winget:
   ```powershell
   winget install OpenJS.NodeJS.LTS -e --silent
   ```
2. Verify Node.js and npm in PowerShell:
   ```powershell
   node -v
   npm -v
   ```

#### Step 2: Configure Windows Defender Firewall Rules
Open ports for HTTP/HTTPS web clients and DICOM communication:
```powershell
New-NetFirewallRule -DisplayName "ApexRad Web Application (HTTP 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Domain,Private
New-NetFirewallRule -DisplayName "ApexRad Reverse Proxy (HTTPS 443)" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -Profile Domain,Private,Public
New-NetFirewallRule -DisplayName "DICOM DIMSE Protocol (Port 104)" -Direction Inbound -LocalPort 104 -Protocol TCP -Action Allow -Profile Domain,Private
New-NetFirewallRule -DisplayName "Orthanc DICOM DIMSE (Port 4242)" -Direction Inbound -LocalPort 4242 -Protocol TCP -Action Allow -Profile Domain,Private
```

#### Step 3: Install and Build the Application
Navigate to the application folder (e.g., `C:\inetpub\apexrad`):
```powershell
cd C:\inetpub\apexrad
npm ci --omit=dev
npm run build
```

#### Step 4: Configure as a Native Windows Service
Use **NSSM** (Non-Sucking Service Manager) to run ApexRad 24/7 with automatic restart on failure:
1. Download NSSM or install via Chocolatey: `choco install nssm -y`
2. Register the service:
   ```powershell
   $nodePath = (Get-Command node).Source
   nssm install ApexRadService "$nodePath" "C:\inetpub\apexrad\server.ts"
   nssm set ApexRadService AppDirectory "C:\inetpub\apexrad"
   nssm set ApexRadService AppEnvironmentExtra "NODE_ENV=production" "PORT=3000"
   nssm set ApexRadService Start SERVICE_AUTO_START
   nssm set ApexRadService AppRestartDelay 5000
   nssm start ApexRadService
   ```
3. Verify status:
   ```powershell
   Get-Service -Name ApexRadService
   ```

#### Step 5: Configure IIS (Internet Information Services) Reverse Proxy
1. In Server Manager, install **IIS** with **URL Rewrite** and **Application Request Routing (ARR)**.
2. In IIS Manager, enable Proxy in Application Request Routing.
3. Configure `web.config` rewrite rules to forward traffic from `https://your-hospital-domain.com` to `http://localhost:3000`.

---

## 4. Linux Server Deployment (Ubuntu / Debian / RHEL / Rocky Linux)

### Option A: Automated Bash Script
```bash
chmod +x deploy-linux.sh
sudo ./deploy-linux.sh
```

### Option B: Step-by-Step Manual Linux Installation

#### Step 1: Install Operating System Packages
On Ubuntu 22.04 or 24.04 LTS:
```bash
sudo apt-get update -y
sudo apt-get install -y curl build-essential nginx ufw dcmtk git
```

Install Node.js 20.x LTS via NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Step 2: Create a Dedicated Service User
Never run healthcare services as root:
```bash
sudo useradd -r -s /bin/false -d /opt/apexrad apexrad
sudo mkdir -p /opt/apexrad /var/log/apexrad /data/dicom_cache
sudo chown -R apexrad:apexrad /opt/apexrad /var/log/apexrad /data/dicom_cache
```

#### Step 3: Copy Code & Compile Production Assets
```bash
sudo cp -r . /opt/apexrad
cd /opt/apexrad
sudo -u apexrad npm ci --omit=dev
sudo -u apexrad npm run build
```

#### Step 4: Configure systemd Service Unit
Create `/etc/systemd/system/apexrad.service`:
```ini
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
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable apexrad
sudo systemctl start apexrad
sudo systemctl status apexrad
```

#### Step 5: Configure NGINX Reverse Proxy with SSL
Copy `nginx.conf` into `/etc/nginx/sites-available/apexrad.conf`:
```bash
sudo ln -s /etc/nginx/sites-available/apexrad.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: Configure UFW Firewall
```bash
sudo ufw allow 80/tcp comment 'HTTP (Redirects to HTTPS)'
sudo ufw allow 443/tcp comment 'HTTPS ApexRad Web Application'
sudo ufw allow 104/tcp comment 'DICOM DIMSE C-STORE / C-FIND'
sudo ufw enable
```

---

## 5. Docker Container Deployment

Docker allows consistent, isolated deployments across Linux, Windows Server, and cloud environments.

### Deployment Commands

1. **Build and start containers in detached mode**:
   ```bash
   docker compose up -d --build
   ```

2. **Verify container health**:
   ```bash
   docker compose ps
   ```

3. **Inspect live service logs**:
   ```bash
   docker compose logs -f apexrad-viewer
   ```

4. **Run healthcheck manually**:
   ```bash
   curl -f http://localhost:3000/api/system/metrics
   ```

---

## 6. PACS Server Connection & Verification

To link ApexRad with an existing PACS server:

1. Open the ApexRad Web Viewer at `https://your-server-ip/`
2. Navigate to the **PACS** tab in the top navigation bar.
3. Click **Add PACS Server**.
4. Enter your hospital PACS specifications:
   - **PACS Name**: e.g. `Departmental CT/MR Archive`
   - **Manufacturer**: e.g. `Orthanc`, `dcm4chee`, `GE Healthcare`, `Philips`, `Siemens`
   - **Remote AE Title**: The Application Entity title configured on your PACS server (e.g. `ORTHANC`, `DCM4CHEE`)
   - **IP Address & Port**: e.g. `10.200.4.50`, Port `104` (or `4242`)
   - **Local AE Title**: Set to `APEXRAD_GW` (ensure this AE Title is whitelisted on your PACS server's authorized caller list)
   - **DICOMweb URL**: e.g. `http://10.200.4.50:8042/dicom-web`
5. Click **Test Connection (C-ECHO)**.
   - The gateway will perform a standard DICOM verification handshake and display ping latency.
   - A successful response will display: `Association Accepted: Success (0000H)`.

---

## 7. Backup and Disaster Recovery

The PACS server remains the authoritative imaging archive. ApexRad stores application configuration, user preferences, measurements, structured reports, and HIPAA audit trails.

### Automated Nightly Backup Script
Execute `backup-restore.sh backup`:
```bash
./backup-restore.sh backup /backup/apexrad
```

### Verification & Restore Procedure
To restore from a backup:
```bash
./backup-restore.sh restore /backup/apexrad/apexrad_backup_20261111.tar.gz
```

---

## 8. Troubleshooting & Maintenance

| Symptom | Cause | Resolution |
|---|---|---|
| **C-ECHO Association Rejected (0101H)** | Calling AE Title not whitelisted | Add `APEXRAD_GW` to the Authorized DICOM Calling AE Titles list on the PACS server. |
| **Connection Timed Out** | Firewall blocking port | Check Windows Defender Firewall or Linux UFW for port 104/4242. Verify network routing between VPC subnets. |
| **DICOMweb 401 Unauthorized** | Missing or invalid credentials | Verify Basic Auth username/password or Bearer Token in PACS configuration modal. |
| **Images render black or low contrast** | Window/Level parameters unset | Check DICOM tag `(0028,1050)` and `(0028,1051)`. Select the appropriate modality preset (e.g. CT Bone, CT Lung). |
| **High Memory Consumption** | Large 3D volume cache | Adjust `DICOM_CACHE_DIR` and set memory cache ceiling in `server.ts` or restart service. |
