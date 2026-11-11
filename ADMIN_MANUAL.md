# ApexRad Enterprise DICOM Web Viewer & Universal PACS Platform
# System Administrator & PACS Engineering Manual

## Table of Contents
1. Introduction & System Scope
2. PACS Connectivity Configuration
   - Adding a Remote PACS Node
   - C-ECHO Verification Diagnostics
   - DICOMweb (QIDO-RS / WADO-RS / STOW-RS) Configuration
3. User Management & Role-Based Access Control (RBAC)
4. HIPAA/GDPR Audit Logging & Security Compliance
5. System Performance Monitoring & Cache Tuning
6. Backup, Disaster Recovery & High Availability
7. Troubleshooting Common PACS Connectivity Errors

---

## 1. Introduction & System Scope
ApexRad is a browser-based, zero-footprint medical imaging platform designed for enterprise radiology workflows. It connects to standards-compliant PACS archives via traditional DICOM DIMSE protocols (port 104) and modern DICOMweb REST services (ports 80/443/8042).

---

## 2. PACS Connectivity Configuration

### Adding a Remote PACS Node
To connect ApexRad to a hospital PACS server:
1. Navigate to the **PACS** tab in the top navigation bar.
2. Click the **Add PACS Server** button.
3. Configure the required connection parameters:
   - **Friendly Name**: Human-readable label (e.g., `Main Campus CT/MR Archive`).
   - **Manufacturer**: Select your vendor (`Orthanc`, `dcm4chee`, `GE Healthcare`, `Philips`, `Siemens`, `Conquest`, `Sectra`, or `Generic DICOMweb`).
   - **Remote AE Title**: The Application Entity Title defined in your PACS server (e.g., `ORTHANC`, `DCM4CHEE`).
   - **IP Address & Port**: Network address (e.g., `10.200.4.50`, Port `104` or `4242`).
   - **Local Gateway AE Title**: Set to `APEXRAD_GW`.
   - **DICOMweb Base URL**: Endpoint for QIDO-RS/WADO-RS (e.g., `https://pacs.hospital.internal/dicom-web`).
   - **Authentication**: `None`, `Basic`, `Bearer`, or `API Key`.
   - **TLS Encryption**: Toggle ON to mandate TLS 1.3 transport security.

### C-ECHO Verification Diagnostics
Click **Test Connection (C-ECHO)** on any configured server card:
- ApexRad initiates a DICOM Association Request using Presentation Context `1.2.840.10008.1.1` (Verification SOP Class).
- If the PACS accepts the association and returns `0000H (Success)`, the latency in milliseconds is recorded and displayed.
- If rejected, error diagnostics will indicate whether the Calling AE Title is unauthorized or a network timeout occurred.

---

## 3. User Management & Role-Based Access Control (RBAC)

ApexRad enforces strict separation of clinical privileges:

| Role | Image Review | Calibration & Measurements | Draft Reports | Sign & Verify Reports | Manage PACS Servers | View Audit Logs |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Radiologist** | Yes | Yes | Yes | Yes | No | No |
| **PACS Administrator** | Yes | Yes | No | No | Yes | Yes |
| **System Administrator**| Yes | No | No | No | Yes | Yes |
| **Referring Physician** | Yes | Yes | No | No | No | No |
| **Technician** | Yes | Yes | No | No | Yes (C-ECHO) | No |
| **Read-only User** | Yes | No | No | No | No | No |

---

## 4. HIPAA/GDPR Audit Logging & Security Compliance
All patient health information (PHI) interactions are recorded in the immutable audit trail:
- **Events Logged**: Patient record access (`OPEN_STUDY`), measurement saving (`SAVE_MEASUREMENT`), report verification (`EXPORT_REPORT`), PACS association tests (`PACS_TEST`), and image downloads.
- **Data Captured**: Timestamp (ISO 8601), Authenticated Username, Active Clinical Role, Action Type, Patient MRN/ID, Study UID, Client IP Address, and action details.
- **Exporting**: Administrators can export the audit log to CSV at any time for regulatory audit submission.

---

## 5. System Performance Monitoring & Cache Tuning
Access the **Admin -> System Telemetry** tab to view real-time performance metrics:
- **CPU Utilization**: Multi-threaded worker load during 3D raymarching and MPR reslicing.
- **RAM Consumption**: In-memory heap used vs. allocated total.
- **DICOM Buffer Pool**: In-memory LRU cache storing decompressed volumetric slices.
- **Active PACS Associations**: Number of active live connections.

---

## 6. Backup, Disaster Recovery & High Availability
- Run `./backup-restore.sh backup` nightly via cron.
- Retain minimum 30 days of configuration and audit snapshots.
- Test disaster recovery quarterly using `./backup-restore.sh restore <backup_file>`.
