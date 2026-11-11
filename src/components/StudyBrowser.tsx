import React, { useState, useRef } from 'react';
import { DicomStudy, DicomSeries, ModalityType } from '../types/dicom';
import { parseDicomP10 } from '../utils/dicomParser';
import { 
  Search, 
  Upload, 
  Filter, 
  Calendar, 
  User, 
  FileCheck, 
  Clock, 
  AlertTriangle, 
  ChevronRight,
  Layers,
  Hospital
} from 'lucide-react';

interface StudyBrowserProps {
  studies: DicomStudy[];
  activeStudy: DicomStudy | null;
  onSelectStudy: (study: DicomStudy, series?: DicomSeries) => void;
  onUploadCustomDicom: (study: DicomStudy) => void;
}

export const StudyBrowser: React.FC<StudyBrowserProps> = ({
  studies,
  activeStudy,
  onSelectStudy,
  onUploadCustomDicom,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter studies based on query, modality, and status
  const filteredStudies = studies.filter((study) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      study.patientName.toLowerCase().includes(q) ||
      study.patientId.toLowerCase().includes(q) ||
      study.accessionNumber.toLowerCase().includes(q) ||
      study.studyDescription.toLowerCase().includes(q);

    const matchesModality =
      selectedModality === 'ALL' || study.modalitiesInStudy.includes(selectedModality as ModalityType);

    const matchesStatus = selectedStatus === 'ALL' || study.status === selectedStatus;

    return matchesQuery && matchesModality && matchesStatus;
  });

  // Handle local DICOM file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const parsed = parseDicomP10(buffer);

      const uploadedStudy: DicomStudy = {
        studyInstanceUid: parsed.studyInstanceUid,
        patientId: parsed.patientId,
        patientName: parsed.patientName,
        patientBirthDate: '1980-01-01',
        patientSex: 'O',
        patientAge: '46Y',
        accessionNumber: parsed.accessionNumber,
        studyDate: parsed.studyDate,
        studyTime: '12:00:00',
        studyDescription: parsed.studyDescription,
        referringPhysician: 'External Transfer',
        institutionName: 'Local Upload DICOM Station',
        modalitiesInStudy: [parsed.modality as ModalityType],
        numberOfSeries: 1,
        numberOfInstances: 1,
        status: 'Unreported',
        criticalFinding: false,
        series: [
          {
            seriesInstanceUid: parsed.seriesInstanceUid,
            seriesNumber: 1,
            seriesDescription: parsed.seriesDescription,
            modality: parsed.modality as ModalityType,
            numberOfInstances: 1,
            bodyPartExamined: 'GENERAL',
            instances: [parsed.instance],
          },
        ],
      };

      onUploadCustomDicom(uploadedStudy);
    } catch (err) {
      console.error('Failed to parse DICOM file:', err);
      alert('Error parsing uploaded DICOM file. Please ensure it is a valid DICOM Part 10 file (.dcm).');
    }
  };

  return (
    <div className="w-full h-full bg-[#07090e] flex flex-col overflow-hidden text-xs select-none">
      {/* Search & Action Bar */}
      <div className="p-3 bg-[#0b0e14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient Name, MRN, Accession #, or Description..."
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Modality Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-slate-800">
          {['ALL', 'CT', 'DX', 'MR', 'US'].map((mod) => (
            <button
              key={mod}
              onClick={() => setSelectedModality(mod)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedModality === mod
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-400 text-[11px]">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#07090e] border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Unreported">Unreported</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Verified">Verified</option>
          </select>
        </div>

        {/* Local .dcm File Upload */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".dcm,application/dicom"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Import local .dcm DICOM file from your computer"
          >
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-medium">Upload .DCM</span>
          </button>
        </div>
      </div>

      {/* Studies Table & Series Drawer */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0b0e14] border-b border-slate-800 text-slate-400 text-[11px] font-semibold sticky top-0 z-10">
              <th className="py-2.5 px-3">Patient Name</th>
              <th className="py-2.5 px-3">Patient ID</th>
              <th className="py-2.5 px-3">Modality</th>
              <th className="py-2.5 px-3">Study Description</th>
              <th className="py-2.5 px-3">Date / Time</th>
              <th className="py-2.5 px-3">Accession</th>
              <th className="py-2.5 px-3">Series / Img</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredStudies.map((study) => {
              const isSelected = activeStudy?.studyInstanceUid === study.studyInstanceUid;
              return (
                <React.Fragment key={study.studyInstanceUid}>
                  <tr
                    onClick={() => onSelectStudy(study)}
                    className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-950/20 text-white' : 'text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-bold text-[10px]">
                        {study.patientName.charAt(0)}
                      </div>
                      <span>{study.patientName}</span>
                      {study.criticalFinding && (
                        <span className="text-[10px] text-rose-400 bg-rose-950/80 border border-rose-800 px-1.5 py-0.2 rounded font-semibold">
                          CRITICAL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{study.patientId}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-teal-400 border border-slate-700">
                        {study.modalitiesInStudy.join(', ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-200">
                      {study.studyDescription}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {study.studyDate} <span className="text-slate-500">{study.studyTime}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{study.accessionNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {study.numberOfSeries} ser / {study.numberOfInstances} img
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[11px] font-medium ${
                          study.status === 'Verified'
                            ? 'text-emerald-400'
                            : study.status === 'Completed'
                            ? 'text-sky-400'
                            : study.status === 'In Progress'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        ● {study.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudy(study);
                        }}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[11px] font-medium transition-colors"
                      >
                        Open in Viewer
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Series Thumbnails Row */}
                  {isSelected && (
                    <tr className="bg-[#0b0e14]/70 border-b border-slate-800">
                      <td colSpan={9} className="py-3 px-6">
                        <div className="flex items-center gap-2 mb-2 text-slate-400 text-[11px] font-medium">
                          <Layers className="w-3.5 h-3.5 text-teal-400" />
                          <span>Acquisition Series ({study.series.length}):</span>
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto pb-1">
                          {study.series.map((ser) => (
                            <button
                              key={ser.seriesInstanceUid}
                              onClick={() => onSelectStudy(study, ser)}
                              className="bg-[#07090e] border border-slate-800 hover:border-teal-500 rounded-lg p-2.5 text-left w-64 shrink-0 transition-colors group"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-semibold text-white group-hover:text-teal-400 text-xs truncate">
                                  #{ser.seriesNumber} · {ser.seriesDescription}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                  {ser.modality}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                                <span>{ser.numberOfInstances} Instances</span>
                                <span>{ser.instances[0]?.rows}x{ser.instances[0]?.columns}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {filteredStudies.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            No matching studies found for the selected query or filters.
          </div>
        )}
      </div>
    </div>
  );
};
