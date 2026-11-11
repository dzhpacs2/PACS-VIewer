import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType,
  ShadingType
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

const HELP_DIR = path.resolve(process.cwd(), 'help');
if (!fs.existsSync(HELP_DIR)) {
  fs.mkdirSync(HELP_DIR, { recursive: true });
}

// Helpers for Word formatting
function createTitle(text: string, subtitle: string) {
  return [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text,
          bold: true,
          size: 40,
          color: '0D9488', // Teal
          font: 'Calibri',
        }),
      ],
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: subtitle,
          italics: true,
          size: 24,
          color: '64748B', // Slate
          font: 'Calibri',
        }),
      ],
      spacing: { after: 400 },
    }),
  ];
}

function createHeading1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        color: '0F172A',
        font: 'Calibri',
      }),
    ],
    spacing: { before: 300, after: 150 },
  });
}

function createHeading2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
        color: '0D9488',
        font: 'Calibri',
      }),
    ],
    spacing: { before: 250, after: 100 },
  });
}

function createHeading3(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: '334155',
        font: 'Calibri',
      }),
    ],
    spacing: { before: 180, after: 80 },
  });
}

function createParagraph(text: string, options?: { bold?: boolean; italics?: boolean; color?: string }) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold || false,
        italics: options?.italics || false,
        color: options?.color || '1E293B',
        size: 22,
        font: 'Calibri',
      }),
    ],
    spacing: { after: 120, line: 276 },
  });
}

function createBullet(text: string, boldPrefix?: string) {
  const children = [];
  if (boldPrefix) {
    children.push(
      new TextRun({
        text: boldPrefix + ' ',
        bold: true,
        size: 22,
        font: 'Calibri',
      })
    );
  }
  children.push(
    new TextRun({
      text,
      size: 22,
      font: 'Calibri',
    })
  );

  return new Paragraph({
    bullet: { level: 0 },
    children,
    spacing: { after: 80 },
  });
}

function createCodeBlock(code: string) {
  const lines = code.split('\n');
  return lines.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Consolas',
            size: 18,
            color: '0F172A',
          }),
        ],
        shading: {
          type: ShadingType.CLEAR,
          fill: 'F1F5F9',
        },
        spacing: { before: 20, after: 20 },
      })
  );
}

function createCallout(title: string, message: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `[${title.toUpperCase()}]: `,
        bold: true,
        color: 'B45309', // Amber
        size: 20,
        font: 'Calibri',
      }),
      new TextRun({
        text: message,
        italics: true,
        size: 20,
        font: 'Calibri',
      }),
    ],
    shading: {
      type: ShadingType.CLEAR,
      fill: 'FEF3C7', // Light Amber
    },
    spacing: { before: 150, after: 150 },
  });
}

// 1. DEDICATED WINDOWS & LINUX INSTALLATION AND CONFIGURATION GUIDE
async function generateWindowsLinuxInstallDoc() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...createTitle(
            'RADOX® DICOM Viewer & Universal PACS Platform',
            'Cross-Platform Installation, Configuration & Administration Guide (Windows & Linux)'
          ),
          createHeading1('1. Overview & Architectural Compatibility'),
          createParagraph(
            'RADOX® is an enterprise-grade medical DICOM Web Viewer and Universal PACS Integration Gateway designed for seamless deployment across both Microsoft Windows Server and Enterprise Linux environments.'
          ),
          createParagraph(
            'The platform features a zero-footprint web client running on modern browser runtimes with WebGL2 hardware acceleration, backed by an Express/Node.js gateway proxy that handles DICOMweb (WADO-RS, QIDO-RS, STOW-RS), DIMSE C-ECHO/C-STORE/C-FIND/C-MOVE networking, HL7 v2.x feeds, and FHIR ImagingStudy resources.'
          ),

          createHeading1('2. System Requirements (Cross-Platform)'),
          createBullet('Processor: Intel Xeon E-2300 / AMD EPYC 7002 or higher (8+ Cores recommended for high-volume 3D raymarching).', 'CPU:'),
          createBullet('Memory: 16 GB RAM minimum, 32 GB to 64 GB ECC recommended for large multi-slice CT/MRI studies.', 'RAM:'),
          createBullet('Storage: High-speed NVMe SSD (minimum 500 GB dedicated for local study cache and spooling buffers).', 'Storage:'),
          createBullet('Network: Dual 1Gbps / 10Gbps redundant Ethernet interfaces (dedicated PACS VLAN recommended).', 'Network:'),
          createBullet('Supported Windows Platforms: Windows Server 2025, Windows Server 2022, Windows Server 2019, Windows 11 Pro/Enterprise.', 'Windows OS:'),
          createBullet('Supported Linux Platforms: Ubuntu 24.04 / 22.04 LTS, Debian 12 (Bookworm), Red Hat Enterprise Linux (RHEL) 9/8, Rocky Linux 9.', 'Linux OS:'),

          createHeading1('3. Complete Installation on Windows Platform'),
          createParagraph(
            'RADOX® provides automated and manual installation mechanisms on Windows Server using PowerShell and NSSM (Non-Sucking Service Manager) to run as an unassisted Windows Service.'
          ),

          createHeading2('3.1 Automated Windows Deployment (Recommended)'),
          createParagraph(
            'Open PowerShell as an Administrator and execute the pre-built deployment script located in the installation directory:'
          ),
          ...createCodeBlock(
            '# Set Execution Policy and Run Automated Deploy Script\nSet-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process\ncd C:\\radox-viewer\n.\\deploy-windows.ps1 -Port 3000 -ServiceName "RadoxPacsGateway"'
          ),
          createParagraph('The automated PowerShell script performs:'),
          createBullet('Verification of Administrator privileges.'),
          createBullet('Automatic installation of Node.js LTS 20+ via winget if missing.'),
          createBullet('Windows Defender Firewall rule configuration for Port 3000 (Web), Port 104 (DIMSE), Port 4242 (Orthanc), and Port 8042 (DICOMweb).'),
          createBullet('Dependency installation and high-performance production build packaging.'),
          createBullet('Automated registration of the "RadoxPacsGateway" Windows Service using NSSM with automatic restart on failure.'),

          createHeading2('3.2 Manual Windows Installation & Service Setup'),
          createParagraph('If manual installation is preferred by hospital IT security policies:'),
          createBullet('Step 1: Install Node.js LTS (v20 or v22) from https://nodejs.org or via winget: "winget install OpenJS.NodeJS.LTS".'),
          createBullet('Step 2: Extract or clone the RADOX® distribution to "C:\\radox-viewer".'),
          createBullet('Step 3: Open an elevated Command Prompt or PowerShell and install dependencies: "npm install --production".'),
          createBullet('Step 4: Build client production assets: "npm run build".'),
          createBullet('Step 5: Install NSSM (Service Manager): "choco install nssm -y" or extract nssm.exe to C:\\Windows\\System32.'),
          createBullet('Step 6: Register the Windows Service: "nssm install RadoxPacsGateway \"C:\\Program Files\\nodejs\\node.exe\" \"C:\\radox-viewer\\server.ts\""'),
          createBullet('Step 7: Configure Service Startup: "nssm set RadoxPacsGateway Start SERVICE_AUTO_START".'),
          createBullet('Step 8: Start the Service: "Start-Service RadoxPacsGateway".'),

          createHeading2('3.3 Windows Firewall Configuration'),
          createParagraph('Execute the following PowerShell commands to grant inbound traffic through Windows Defender Firewall:'),
          ...createCodeBlock(
            'New-NetFirewallRule -DisplayName "RADOX Web App (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Domain,Private\nNew-NetFirewallRule -DisplayName "RADOX DICOM DIMSE (Port 104)" -Direction Inbound -LocalPort 104 -Protocol TCP -Action Allow -Profile Domain,Private\nNew-NetFirewallRule -DisplayName "RADOX Orthanc Archive (Port 4242)" -Direction Inbound -LocalPort 4242 -Protocol TCP -Action Allow -Profile Domain,Private'
          ),

          createHeading1('4. Complete Installation on Linux Platform'),
          createParagraph(
            'RADOX® runs natively on Linux under systemd with an unprivileged system user, optimized for high uptime and 24/7 diagnostic reliability.'
          ),

          createHeading2('4.1 Automated Linux Deployment (Ubuntu / Debian / RHEL)'),
          createParagraph(
            'Execute the included deployment script with root/sudo privileges:'
          ),
          ...createCodeBlock(
            'cd /opt/radox-viewer\nchmod +x deploy-linux.sh\nsudo ./deploy-linux.sh'
          ),
          createParagraph('The automated Linux script performs:'),
          createBullet('System packages upgrade and installation of curl, git, build-essential, nginx, ufw, and dcmtk.'),
          createBullet('Creation of dedicated unprivileged service user: "radox" (/sbin/nologin).'),
          createBullet('Node.js LTS 20.x setup via NodeSource official distribution repository.'),
          createBullet('Production bundling and caching optimizations.'),
          createBullet('Systemd service unit creation (/etc/systemd/system/radox.service) and enablement on system boot.'),
          createBullet('Uncomplicated Firewall (UFW) rule activation.'),

          createHeading2('4.2 Manual Linux Service Configuration (systemd)'),
          createParagraph('Create the systemd service file at "/etc/systemd/system/radox.service":'),
          ...createCodeBlock(
            '[Unit]\nDescription=RADOX(r) Enterprise DICOM Web Viewer & PACS Gateway\nAfter=network.target\n\n[Service]\nType=simple\nUser=radox\nGroup=radox\nWorkingDirectory=/opt/radox-viewer\nExecStart=/usr/bin/node /opt/radox-viewer/server.ts\nRestart=always\nRestartSec=5\nEnvironment=NODE_ENV=production PORT=3000\nLimitNOFILE=65536\n\n[Install]\nWantedBy=multi-user.target'
          ),
          createParagraph('Activate and start the systemd unit:'),
          ...createCodeBlock(
            'sudo systemctl daemon-reload\nsudo systemctl enable radox\nsudo systemctl start radox\nsudo systemctl status radox'
          ),

          createHeading1('5. Docker & Containerized Orchestration (Windows & Linux)'),
          createParagraph(
            'For hybrid or containerized platforms (Docker Desktop on Windows, or Docker Engine on Linux):'
          ),
          ...createCodeBlock(
            '# Build and start RADOX Viewer with integrated Orthanc PACS\ndocker compose up -d --build\n\n# Check container health status\ndocker ps\ncurl -f http://localhost:3000/api/system/metrics'
          ),

          createHeading1('6. PACS Configuration & Modality Integration'),
          createParagraph(
            'Once RADOX® is running, access the administrative web interface at http://<server-ip>:3000 to configure PACS servers:'
          ),
          createHeading2('6.1 Connecting Modalities (CT, MRI, X-Ray, Ultrasound)'),
          createBullet('Step 1: Open the "Admin & PACS" tab in the top navigation bar.'),
          createBullet('Step 2: Enter Local Application Entity Title: "RADOX_GW".'),
          createBullet('Step 3: Click "Add PACS Server" and enter Remote AE Title (e.g., ORTHANC, DCM4CHEE, GE_CENTRICITY), Host IP, and Port (104, 4242, or 11112).'),
          createBullet('Step 4: Click "Test Connection (C-ECHO)" to verify DICOM association handshake (Status: 0000H Success).'),
          createBullet('Step 5: Click "Save & Set Default" to route modality queries to this archive.'),

          createHeading2('6.2 DICOMweb WADO-RS / QIDO-RS RESTful Configuration'),
          createParagraph(
            'For cloud archives or high-speed web retrieval, enable DICOMweb with the base URL: http://<pacs-ip>:8042/dicom-web. Configure authentication (Bearer Token or HTTP Basic) as required by the hospital security policy.'
          ),

          createHeading1('7. Verification, Health Checks & Troubleshooting'),
          createParagraph('Verify system operational status using standard diagnostics:'),
          createBullet('Windows: Check service state in PowerShell: "Get-Service RadoxPacsGateway" or Event Viewer -> Application Logs.'),
          createBullet('Linux: Check service state via journalctl: "journalctl -u radox -f -n 50".'),
          createBullet('HTTP API Health Endpoint: "curl http://localhost:3000/api/system/metrics" returns CPU, RAM, active sessions, and PACS ping status.'),
          createBullet('Browser Access: Open Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari and navigate to http://<server-ip>:3000.'),

          createCallout(
            'Production Note',
            'In clinical environments, always deploy NGINX or IIS as a reverse proxy in front of RADOX® to terminate TLS 1.3 encryption (HTTPS) on port 443 with valid hospital certificates.'
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(HELP_DIR, 'RADOX_Windows_and_Linux_Installation_Guide.docx'), buffer);
  console.log('Generated: RADOX_Windows_and_Linux_Installation_Guide.docx');
}

// 2. Generate Master Deployment Guide
async function generateDeploymentDoc() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...createTitle(
            'RADOX® Enterprise DICOM Web Viewer',
            'Master Production Deployment & Infrastructure Manual'
          ),
          createHeading1('1. Executive Overview & System Architecture'),
          createParagraph(
            'RADOX® is an enterprise-grade, browser-based diagnostic DICOM viewer and universal PACS integration platform designed for hospitals, outpatient imaging centers, and clinical teleradiology networks.'
          ),
          createParagraph(
            'The platform delivers multi-modality 2D/3D visualization, dynamic Multiplanar Reconstruction (MPR), Maximum Intensity Projection (MIP), calibrated Hounsfield Unit diagnostics, and comprehensive DICOMweb / DIMSE interoperability.'
          ),

          createHeading2('Three-Tier Infrastructure Architecture'),
          createBullet(
            'Zero-footprint web application utilizing WebGL2 and multi-threaded Web Workers for hardware-accelerated volumetric raymarching.',
            'Tier 1 (Client):'
          ),
          createBullet(
            'Node.js & Express universal integration proxy handling DICOMweb QIDO-RS, WADO-RS, STOW-RS, and traditional DICOM DIMSE C-ECHO handshakes.',
            'Tier 2 (Gateway):'
          ),
          createBullet(
            'Hospital imaging archive (Orthanc, dcm4chee, GE Healthcare, Philips, Siemens, Sectra, Conquest).',
            'Tier 3 (PACS Archive):'
          ),

          createHeading1('2. Hardware & Operating System Prerequisites'),
          createParagraph('Minimum and recommended specifications for production deployments:'),
          createBullet('CPU: 8 Cores (3.0 GHz+ recommended for multi-user 3D CT/MRI raymarching).'),
          createBullet('RAM: 16 GB to 32 GB ECC Memory.'),
          createBullet('Storage: High-speed NVMe SSD (minimum 500 GB dedicated for in-memory LRU DICOM cache).'),
          createBullet('Network: 1 Gbps to 10 Gbps redundant network interface.'),
          createBullet('Supported Operating Systems: Windows Server 2019/2022/2025, Ubuntu 22.04/24.04 LTS, Debian 12, RHEL 9, Rocky Linux 9.'),

          createHeading1('3. Windows Server Automated Deployment (2019 / 2022 / 2025)'),
          createParagraph(
            'An automated PowerShell installation script (deploy-windows.ps1) is provided in the repository root. Run the following command in an elevated PowerShell session (Run as Administrator):'
          ),
          ...createCodeBlock(
            'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process\n.\\deploy-windows.ps1'
          ),
          createParagraph('The automated Windows script performs the following tasks:'),
          createBullet('Checks and installs Node.js LTS 20+ via winget if missing.'),
          createBullet('Configures Windows Defender Firewall inbound rules for HTTP (3000), DIMSE (104), Orthanc (4242), and DICOMweb (8042).'),
          createBullet('Compiles the production React application and server assets.'),
          createBullet('Registers the RADOX® background service with NSSM (SERVICE_AUTO_START with automatic crash recovery).'),

          createHeading1('4. Linux Server Automated Deployment (Ubuntu / Debian / RHEL)'),
          createParagraph(
            'An automated Bash deployment script (deploy-linux.sh) is provided for Linux installations. Execute with root privileges:'
          ),
          ...createCodeBlock(
            'chmod +x deploy-linux.sh\nsudo ./deploy-linux.sh'
          ),
          createParagraph('The script automatically executes:'),
          createBullet('Installs OS packages: curl, build-essential, nginx, ufw, dcmtk.'),
          createBullet('Creates an unprivileged dedicated service user: radox (/bin/false).'),
          createBullet('Builds assets and establishes systemd daemon: /etc/systemd/system/radox.service.'),
          createBullet('Configures UFW firewall rules for web and DICOM ports.'),

          createHeading1('5. Docker & Containerized Orchestration'),
          createParagraph(
            'For containerized hospital deployments, a production multi-stage Dockerfile and docker-compose.yml are included. Launch the platform with:'
          ),
          ...createCodeBlock(
            'docker compose up -d --build'
          ),
          createParagraph('This starts both the RADOX® viewer on port 3000 and an integrated Orthanc PACS research archive on ports 4242 and 8042.'),

          createHeading1('6. NGINX Reverse Proxy & TLS 1.3 Encryption'),
          createParagraph(
            'Per HIPAA and healthcare privacy regulations, all external client traffic must be encrypted with TLS 1.2/1.3. A pre-configured nginx.conf is provided with strict transport security, WebSocket proxying, and streaming buffer optimizations.'
          ),
          createCallout(
            'Security Warning',
            'Never expose internal hospital database ports or unauthenticated DICOM DIMSE ports (104) directly to the public internet.'
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(HELP_DIR, 'RADOX_Enterprise_Deployment_Guide.docx'), buffer);
  console.log('Generated: RADOX_Enterprise_Deployment_Guide.docx');
}

// 3. Generate PACS Administrator Manual
async function generateAdminManual() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...createTitle(
            'RADOX® Enterprise DICOM Platform',
            'PACS Administrator, Interoperability & Integration Guide'
          ),
          createHeading1('1. DICOM DIMSE & DICOMweb Architecture'),
          createParagraph(
            'RADOX® features a multi-vendor PACS integration gateway supporting both traditional DICOM DIMSE networking and modern RESTful DICOMweb.'
          ),

          createHeading2('Supported Services'),
          createBullet('C-ECHO (Verification Service): Real-time roundtrip heartbeat verification.', 'C-ECHO:'),
          createBullet('C-FIND (Query Service): Hierarchical Patient/Study/Series/Instance search.', 'C-FIND:'),
          createBullet('C-MOVE (Retrieve Service): Transmits DICOM instances back to destination AE.', 'C-MOVE:'),
          createBullet('C-STORE (Storage Service): Ingests images into the local spool cache.', 'C-STORE:'),
          createBullet('WADO-RS (RESTful Web Retrieval): High-efficiency binary multipart streams.', 'WADO-RS:'),
          createBullet('QIDO-RS (RESTful Web Query): JSON query syntax for modern integrations.', 'QIDO-RS:'),

          createHeading1('2. PACS Server Federation & Verification'),
          createParagraph(
            'Click the "Test Connection (C-ECHO)" button on any server card. RADOX® initiates a DICOM Association Verification handshake (SOP Class 1.2.840.10008.1.1). The interface returns the exact round-trip ping latency and association status (0000H Success).'
          ),

          createHeading1('3. Role-Based Access Control (RBAC)'),
          createParagraph('RADOX® enforces 6 distinct clinical roles:'),
          createBullet('Radiologist: Unrestricted diagnostic tools, measurements, reporting, digital sign-off.'),
          createBullet('Referring Physician: Read-only viewport, basic W/L, clinical impressions.'),
          createBullet('Technologist: Image quality control, QA tagging, orientation flip/rotate.'),
          createBullet('PACS Admin: Full server registry, C-ECHO testing, AE Title maintenance, telemetry.'),
          createBullet('Medical Student: Guided viewing, annotation toggling, no report modification.'),
          createBullet('Chief of Radiology: Senior QA oversight, final countersignatures, audit log inspection.'),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(HELP_DIR, 'RADOX_PACS_Administrator_Manual.docx'), buffer);
  console.log('Generated: RADOX_PACS_Administrator_Manual.docx');
}

// 4. Generate Radiology User Manual
async function generateUserManual() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...createTitle(
            'RADOX® Diagnostic DICOM Viewer',
            'Radiologist & Clinical User Manual'
          ),
          createHeading1('1. Clinical Workstation Interface'),
          createParagraph(
            'RADOX® is designed for high-efficiency clinical reading workflows, offering multi-viewport arrangements, standardized DICOM corner overlays, and advanced measurement calipers.'
          ),

          createHeading1('2. Window / Level (Hounsfield Unit Calibration)'),
          createParagraph('Standard presets for CT visualization:'),
          createBullet('Lung: Window Width 1500, Window Level -600 (ideal for parenchyma and nodules).'),
          createBullet('Soft Tissue: Window Width 350, Window Level 40 (mediastinum, liver, musculature).'),
          createBullet('Bone: Window Width 2000, Window Level 400 (cortical detail and fractures).'),
          createBullet('Brain: Window Width 80, Window Level 40 (gray-white matter differentiation).'),
          createBullet('Liver: Window Width 150, Window Level 30 (contrast lesion contrast).'),

          createHeading1('3. Calibrated Diagnostic Measurements'),
          createParagraph('Precision tools with physical pixel-spacing calibration:'),
          createBullet('Linear Distance: Euclidean distance in millimeters (mm) based on (0028,0030) Pixel Spacing.'),
          createBullet('Cobb Angle: Four-point vertebral tilt calculation for scoliosis assessments.'),
          createBullet('Open Angle: Three-point anatomical articulation angles.'),
          createBullet('Elliptical ROI: Computes Area (cm²), Mean HU, Minimum HU, Maximum HU, and Standard Deviation.'),

          createHeading1('4. Multiplanar Reconstruction (MPR) & 3D Volume Rendering'),
          createParagraph(
            'RADOX® provides instant orthogonal re-slicing across Axial, Coronal, and Sagittal planes with cross-hair slice synchronization. The 3D Volume Renderer uses WebGL raymarching to produce volume renderings of bony structures, soft tissues, and vascular trees.'
          ),

          createHeading1('5. Diagnostic Reporting & Digital Sign-Off'),
          createParagraph(
            'Radiologists can compose structured reports, tag critical findings, and submit cryptographic digital signatures conforming to clinical audit standards.'
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(HELP_DIR, 'RADOX_Radiology_User_Manual.docx'), buffer);
  console.log('Generated: RADOX_Radiology_User_Manual.docx');
}

// 5. Generate Disaster Recovery and Security Guide
async function generateSecurityDoc() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...createTitle(
            'RADOX® Enterprise Security & Compliance',
            'HIPAA/GDPR Compliance, Backup & Disaster Recovery Guide'
          ),
          createHeading1('1. Regulatory Compliance Framework'),
          createParagraph(
            'RADOX® is architected in alignment with HIPAA Security and Privacy Rules, HITECH, GDPR Article 32 (Security of Processing), and ISO 27799 (Health Informatics Information Security Management).'
          ),

          createHeading1('2. Data Protection at Rest & in Transit'),
          createBullet('In Transit: Mandatory TLS 1.3 / TLS 1.2 with perfect forward secrecy across all DICOMweb and HTTP client connections.'),
          createBullet('At Rest: Encrypted storage volumes for local DICOM cache buffers and report metadata.'),
          createBullet('De-Identification: DICOM Tag Inspector includes simulated de-identification masking patient names, IDs, and birth dates.'),

          createHeading1('3. Automated Backup & Recovery Procedures'),
          createParagraph('Execute the provided backup-restore.sh script to take encrypted snapshots:'),
          ...createCodeBlock(
            './backup-restore.sh backup /backup/radox\n./backup-restore.sh restore /backup/radox/snapshot.tar.gz'
          ),
          createParagraph('RPO (Recovery Point Objective): < 1 hour. RTO (Recovery Time Objective): < 15 minutes.'),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(HELP_DIR, 'RADOX_Disaster_Recovery_and_Security.docx'), buffer);
  console.log('Generated: RADOX_Disaster_Recovery_and_Security.docx');
}

async function run() {
  console.log('Generating RADOX(r) Microsoft Word (.docx) documentation suite in /help/ ...');
  await generateWindowsLinuxInstallDoc();
  await generateDeploymentDoc();
  await generateAdminManual();
  await generateUserManual();
  await generateSecurityDoc();
  console.log('All RADOX(r) .docx files successfully created in /help/ directory!');
}

run().catch((err) => {
  console.error('Error generating docs:', err);
  process.exit(1);
});
