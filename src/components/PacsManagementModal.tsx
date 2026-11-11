import React, { useState, useEffect } from 'react';
import { PacsServerConfig } from '../types/dicom';
import { 
  Server, 
  Plus, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  ShieldCheck, 
  Wifi, 
  Edit3, 
  RefreshCw 
} from 'lucide-react';

interface PacsManagementModalProps {
  onClose?: () => void;
}

export const PacsManagementModal: React.FC<PacsManagementModalProps> = () => {
  const [servers, setServers] = useState<PacsServerConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  // Form modal for adding a new server
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<PacsServerConfig>>({
    name: 'Hospital Archive Node',
    manufacturer: 'Orthanc',
    aeTitle: 'ORTHANC_CORE',
    ipAddress: '192.168.1.100',
    port: 4242,
    localAeTitle: 'APEXRAD_GW',
    dicomWebUrl: 'http://192.168.1.100:8042/dicom-web',
    authType: 'None',
    tlsEnabled: false,
    connectionTimeoutSec: 15,
    isDefault: false,
  });

  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pacs/servers');
      const data = await res.json();
      if (data.success) {
        setServers(data.servers);
      }
    } catch (err) {
      console.error('Failed to load PACS servers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleTestEcho = async (id: string) => {
    try {
      setTestingId(id);
      setTestResult(null);
      const res = await fetch(`/api/pacs/echo/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          id,
          success: true,
          msg: `C-ECHO Succeeded: ${data.status} · RTT Latency: ${data.pingMs} ms · Local: ${data.localAeTitle} -> Remote: ${data.aeTitle}`,
        });
        fetchServers();
      } else {
        setTestResult({
          id,
          success: false,
          msg: `Association Rejected: ${data.error || 'Connection timed out'}`,
        });
      }
    } catch (err) {
      setTestResult({
        id,
        success: false,
        msg: 'Network failure communicating with PACS server gateway',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pacs/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchServers();
      }
    } catch (err) {
      console.error('Error saving PACS server:', err);
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this PACS server connection?')) return;
    try {
      await fetch(`/api/pacs/servers/${id}`, { method: 'DELETE' });
      fetchServers();
    } catch (err) {
      console.error('Error deleting server:', err);
    }
  };

  return (
    <div className="w-full h-full bg-[#07090e] p-4 overflow-y-auto text-xs select-none">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0b0e14] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-950/60 border border-teal-800">
              <Server className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Universal PACS Server Connectivity Gateway
              </h2>
              <div className="text-slate-400 text-[11px]">
                Multi-vendor DICOMweb (QIDO-RS, WADO-RS, STOW-RS) & Traditional DIMSE C-ECHO/C-FIND Gateway
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add PACS Server</span>
          </button>
        </div>

        {/* Test Result Toast Banner */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${
              testResult.success
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{testResult.msg}</span>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* PACS Servers Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers.map((server) => (
            <div
              key={server.id}
              className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 space-y-3 relative hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{server.name}</h3>
                    {server.isDefault && (
                      <span className="text-[10px] bg-teal-950 text-teal-400 border border-teal-800 px-1.5 py-0.2 rounded font-mono font-semibold">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Vendor: <span className="text-slate-200">{server.manufacturer}</span> · Local Gateway AE: <span className="text-teal-400">{server.localAeTitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      server.status === 'Connected'
                        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                        : 'text-rose-400 bg-rose-950/60 border border-rose-800'
                    }`}
                  >
                    ● {server.status}
                  </span>
                </div>
              </div>

              {/* Server Parameters Grid */}
              <div className="grid grid-cols-2 gap-2 bg-[#07090e] p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block">Remote AE Title:</span>
                  <span className="text-white font-semibold">{server.aeTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">DIMSE Address:</span>
                  <span className="text-slate-200">{server.ipAddress}:{server.port}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">DICOMweb Endpoint:</span>
                  <span className="text-teal-400 truncate block">{server.dicomWebUrl}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Security & TLS:</span>
                  <span className="text-slate-200">
                    {server.tlsEnabled ? 'TLS 1.3' : 'Plain'} · Auth: {server.authType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Last Verified:</span>
                  <span className="text-slate-300">
                    {server.lastPingMs ? `${server.lastPingMs} ms latency` : 'Never'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleTestEcho(server.id)}
                  disabled={testingId === server.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{testingId === server.id ? 'Testing C-ECHO...' : 'Test Connection (C-ECHO)'}</span>
                </button>

                <button
                  onClick={() => handleDeleteServer(server.id)}
                  className="p-1.5 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete PACS Server"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Server Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#0b0e14] border border-slate-700 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-teal-400" />
                  <span>Add PACS Server Connection</span>
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveServer} className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Friendly Server Name:</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#07090e] border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Manufacturer:</label>
                    <select
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value as any })}
                      className="w-full bg-[#07090e] border border-slate-800 rounded px-2 py-1.5 text-white"
                    >
                      <option value="Orthanc">Orthanc</option>
                      <option value="dcm4chee">dcm4chee</option>
                      <option value="GE Healthcare">GE Healthcare</option>
                      <option value="Philips">Philips IntelliSpace</option>
                      <option value="Siemens">Siemens syngo.plaza</option>
                      <option value="Conquest">Conquest</option>
                      <option value="Sectra">Sectra</option>
                      <option value="Generic DICOMweb">Generic DICOMweb</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Remote AE Title:</label>
                    <input
                      type="text"
                      required
                      value={formData.aeTitle}
                      onChange={(e) => setFormData({ ...formData, aeTitle: e.target.value })}
                      className="w-full bg-[#07090e] border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">IP Address / Hostname:</label>
                    <input
                      type="text"
                      required
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      className="w-full bg-[#07090e] border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Port:</label>
                    <input
                      type="number"
                      required
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) })}
                      className="w-full bg-[#07090e] border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">DICOMweb Base URL:</label>
                  <input
                    type="url"
                    value={formData.dicomWebUrl}
                    onChange={(e) => setFormData({ ...formData, dicomWebUrl: e.target.value })}
                    className="w-full bg-[#07090e] border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tlsEnabled}
                      onChange={(e) => setFormData({ ...formData, tlsEnabled: e.target.checked })}
                      className="accent-teal-500"
                    />
                    <span>Enable TLS Encryption</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="accent-teal-500"
                    />
                    <span>Set as Default PACS</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded font-semibold"
                  >
                    Save PACS Connection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
