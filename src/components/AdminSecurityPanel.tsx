import React, { useState, useEffect } from 'react';
import { AuditLog, UserRole } from '../types/dicom';
import { 
  ShieldCheck, 
  Lock, 
  Activity, 
  FileSpreadsheet, 
  Cpu, 
  HardDrive, 
  Users, 
  Clock, 
  Download,
  AlertCircle
} from 'lucide-react';

interface SystemMetrics {
  uptimeSec: number;
  cpuPercent: number;
  ramMb: number;
  ramTotalMb: number;
  dicomCacheBufferMb: number;
  activeSessions: number;
  activePacsConnections: number;
  totalStudiesIndexed: number;
}

export const AdminSecurityPanel: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'rbac' | 'metrics'>('audit');

  useEffect(() => {
    // Fetch audit logs
    fetch('/api/audit')
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setAuditLogs(data.logs);
      })
      .catch((err) => console.error('Failed to load audit logs:', err));

    // Fetch metrics
    fetch('/api/system/metrics')
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch((err) => console.error('Failed to load metrics:', err));
  }, []);

  const handleExportAuditCsv = () => {
    if (auditLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Patient ID', 'IP Address', 'Details'];
    const rows = auditLogs.map((l) => [
      l.id,
      l.timestamp,
      l.username,
      l.role,
      l.action,
      l.patientId || 'N/A',
      l.ipAddress,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ApexRad_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rbacMatrix: { role: UserRole; view: boolean; measure: boolean; report: boolean; sign: boolean; pacs: boolean; admin: boolean }[] = [
    { role: 'Radiologist', view: true, measure: true, report: true, sign: true, pacs: false, admin: false },
    { role: 'PACS Administrator', view: true, measure: true, report: false, sign: false, pacs: true, admin: true },
    { role: 'System Administrator', view: true, measure: false, report: false, sign: false, pacs: true, admin: true },
    { role: 'Referring Physician', view: true, measure: true, report: false, sign: false, pacs: false, admin: false },
    { role: 'Technician', view: true, measure: true, report: false, sign: false, pacs: true, admin: false },
    { role: 'Read-only User', view: true, measure: false, report: false, sign: false, pacs: false, admin: false },
  ];

  return (
    <div className="w-full h-full bg-[#07090e] p-4 overflow-y-auto text-xs select-none">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0b0e14] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Enterprise Security, RBAC & HIPAA Audit System
              </h2>
              <div className="text-slate-400 text-[11px]">
                Comprehensive Patient Access Logging, Role Entitlements, and Real-Time Infrastructure Telemetry
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'audit' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Audit Trail
            </button>
            <button
              onClick={() => setActiveTab('rbac')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'rbac' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              RBAC Permissions
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'metrics' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              System Telemetry
            </button>
          </div>
        </div>

        {/* Tab 1: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">HIPAA & GDPR Access Logs</h3>
                <div className="text-slate-400 text-[11px]">
                  Immutable record of patient data access, image exports, report verifications, and PACS associations
                </div>
              </div>

              <button
                onClick={handleExportAuditCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#07090e] text-slate-400 text-[11px] font-mono border-b border-slate-800">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">User & Role</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Patient ID</th>
                    <th className="py-2 px-3">Details</th>
                    <th className="py-2 px-3">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 text-slate-300">
                      <td className="py-2 px-3 font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-white">{log.username}</span>
                        <span className="text-slate-500 block text-[10px]">{log.role}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-teal-400 font-semibold">{log.action}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">{log.patientId || '—'}</td>
                      <td className="py-2 px-3 max-w-sm truncate text-slate-200">{log.details}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: RBAC Matrix */}
        {activeTab === 'rbac' && (
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Role-Based Access Control (RBAC) Matrix</h3>
              <div className="text-slate-400 text-[11px]">
                Enforces diagnostic authority, DICOM node management, and clinical verification boundaries
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#07090e] text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                  <th className="py-2.5 px-3">Clinical Role</th>
                  <th className="py-2.5 px-3 text-center">View Images</th>
                  <th className="py-2.5 px-3 text-center">Measurements</th>
                  <th className="py-2.5 px-3 text-center">Draft Reports</th>
                  <th className="py-2.5 px-3 text-center">Sign & Verify</th>
                  <th className="py-2.5 px-3 text-center">PACS Gateway</th>
                  <th className="py-2.5 px-3 text-center">System Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {rbacMatrix.map((row) => (
                  <tr key={row.role} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-white">{row.role}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">{row.view ? '● Granted' : '—'}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">{row.measure ? '● Granted' : '—'}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">{row.report ? '● Granted' : '—'}</td>
                    <td className="py-2.5 px-3 text-center text-teal-400">{row.sign ? '● Granted' : '—'}</td>
                    <td className="py-2.5 px-3 text-center text-amber-400">{row.pacs ? '● Granted' : '—'}</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">{row.admin ? '● Granted' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: System Telemetry */}
        {activeTab === 'metrics' && metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>CPU Utilization</span>
                <Cpu className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">{metrics.cpuPercent}%</div>
              <div className="text-[10px] text-slate-500">Multicore worker thread load</div>
            </div>

            <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>RAM Consumption</span>
                <HardDrive className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {metrics.ramMb} <span className="text-xs font-normal text-slate-400">/ {metrics.ramTotalMb} MB</span>
              </div>
              <div className="text-[10px] text-slate-500">Heap allocated memory</div>
            </div>

            <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>DICOM Cache</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">{metrics.dicomCacheBufferMb} MB</div>
              <div className="text-[10px] text-slate-500">In-memory pixel buffer pool</div>
            </div>

            <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Active PACS Nodes</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">{metrics.activePacsConnections}</div>
              <div className="text-[10px] text-slate-500">Connected DICOMweb / DIMSE nodes</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
