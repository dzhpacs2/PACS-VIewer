import React from 'react';
import { 
  DicomStudy, 
  LayoutType, 
  UserRole 
} from '../types/dicom';
import { 
  LayoutGrid, 
  Square, 
  Columns, 
  Rows, 
  Grid2X2, 
  Grid3X3, 
  Box, 
  Activity, 
  FileText, 
  Server, 
  ShieldCheck, 
  Terminal, 
  FolderOpen, 
  Maximize2, 
  Minimize2,
  HardDrive
} from 'lucide-react';

interface WorkstationHeaderProps {
  activeStudy: DicomStudy | null;
  activeLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  activeView: 'viewer' | 'worklist' | 'reports' | 'pacs' | 'security' | 'deploy';
  onViewChange: (view: 'viewer' | 'worklist' | 'reports' | 'pacs' | 'security' | 'deploy') => void;
  currentUserRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  pacsConnectedCount: number;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({
  activeStudy,
  activeLayout,
  onLayoutChange,
  activeView,
  onViewChange,
  currentUserRole,
  onRoleChange,
  isFullscreen,
  onToggleFullscreen,
  pacsConnectedCount,
}) => {
  return (
    <header className="h-12 bg-[#0b0e14] border-b border-slate-800 px-3 flex items-center justify-between text-xs select-none shrink-0 z-30">
      {/* Zone 1: Brand & Active Patient Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 tracking-tight text-sm font-sans flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />
            RADOX &reg;
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            Enterprise PACS v4.2
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {activeStudy ? (
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-semibold text-white tracking-wide truncate max-w-[140px]">
              {activeStudy.patientName}
            </span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-slate-400">{activeStudy.patientId}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{activeStudy.patientAge}/{activeStudy.patientSex}</span>
            <span className="text-slate-500">·</span>
            <span className="text-teal-400 font-medium truncate max-w-[160px]">
              {activeStudy.studyDescription}
            </span>
            {activeStudy.criticalFinding && (
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-1.5 py-0.2 rounded">
                CRITICAL
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 italic">No study loaded in active viewport</span>
        )}
      </div>

      {/* Zone 2: Navigation Views */}
      <nav className="flex items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-slate-800/80">
        <button
          onClick={() => onViewChange('worklist')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeView === 'worklist' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Modality Worklist (MWL)"
        >
          <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
          <span>Worklist</span>
        </button>

        <button
          onClick={() => onViewChange('viewer')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeView === 'viewer' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Diagnostic DICOM Viewer"
        >
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>Viewer</span>
        </button>

        <button
          onClick={() => onViewChange('reports')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeView === 'reports' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Structured Radiology Reporting"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Reports</span>
        </button>

        <button
          onClick={() => onViewChange('pacs')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeView === 'pacs' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Universal PACS Connectivity"
        >
          <Server className="w-3.5 h-3.5 text-amber-400" />
          <span>PACS ({pacsConnectedCount})</span>
        </button>

        <button
          onClick={() => onViewChange('security')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeView === 'security' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Security, RBAC & Audit Trails"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Admin</span>
        </button>

        <button
          onClick={() => onViewChange('deploy')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeView === 'deploy' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Windows & Linux Deployment Guides"
        >
          <Terminal className="w-3.5 h-3.5 text-violet-400" />
          <span>Deploy</span>
        </button>
      </nav>

      {/* Zone 3: Viewport Layout & User Role Actions */}
      <div className="flex items-center gap-3">
        {/* Layout Grid Buttons (only shown in viewer mode) */}
        {activeView === 'viewer' && (
          <div className="flex items-center gap-1 bg-[#07090e] p-0.5 rounded border border-slate-800">
            <button
              onClick={() => onLayoutChange('1x1')}
              className={`p-1 rounded ${activeLayout === '1x1' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Single Viewport (1x1)"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLayoutChange('1x2')}
              className={`p-1 rounded ${activeLayout === '1x2' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Split Horizontal (1x2)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLayoutChange('2x1')}
              className={`p-1 rounded ${activeLayout === '2x1' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Split Vertical (2x1)"
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLayoutChange('2x2')}
              className={`p-1 rounded ${activeLayout === '2x2' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Quad Viewports (2x2)"
            >
              <Grid2X2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLayoutChange('mpr')}
              className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                activeLayout === 'mpr' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Multiplanar Reconstruction (Axial, Coronal, Sagittal)"
            >
              MPR
            </button>
            <button
              onClick={() => onLayoutChange('3d')}
              className={`px-2 py-0.5 rounded font-medium text-[11px] flex items-center gap-1 ${
                activeLayout === '3d' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3D Volume Rendering & MIP"
            >
              <Box className="w-3 h-3" />
              <span>3D</span>
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-slate-800" />

        {/* User Role Selector */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="user-role-select" className="text-slate-400 text-[11px]">Role:</label>
          <select
            id="user-role-select"
            value={currentUserRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-[#07090e] border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-teal-500"
          >
            <option value="Radiologist">Radiologist</option>
            <option value="PACS Administrator">PACS Administrator</option>
            <option value="System Administrator">System Administrator</option>
            <option value="Referring Physician">Referring Physician</option>
            <option value="Technician">Technician</option>
            <option value="Read-only User">Read-only User</option>
          </select>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
