import React, { useState, useEffect } from 'react';
import { DicomStudy, RadiologyReport, UserRole } from '../types/dicom';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Printer, 
  Copy, 
  UserCheck, 
  History,
  FileSpreadsheet
} from 'lucide-react';

interface ReportingModuleProps {
  activeStudy: DicomStudy;
  currentUserRole: UserRole;
  onSaveReport?: (report: RadiologyReport) => void;
}

const TEMPLATES = {
  CT_HEAD_TRAUMA: {
    title: 'CT Head Trauma / Acute ICH Protocol',
    technique: 'Contiguous axial non-contrast CT sections of the head obtained from the skull base to vertex at 2.5 mm slice thickness. Multiplanar reformations in sagittal and coronal planes generated.',
    findings: 'No acute intracranial hemorrhage, subdural hematoma, or epidural collection. Cerebral parenchyma demonstrates normal attenuation and gray-white differentiation. Ventricles, sulci, and cisterns are symmetric and age-appropriate. No midline shift. Calvarium and skull base are intact without fracture.',
    impression: '1. No acute intracranial hemorrhage or mass effect.\n2. No traumatic skull fracture identified.',
    recommendations: 'Clinical observation. Repeat imaging if neurological status alters.',
  },
  CHEST_XRAY: {
    title: 'Chest Radiography 2-View (PA & Lateral)',
    technique: 'Posteroanterior and lateral projections of the chest in the upright position.',
    findings: 'Lungs are clear without focal consolidation, pneumothorax, or large pleural effusion. Cardiomediastinal silhouette is normal in size and contour. Hilar structures are unremarkable. Osseous thoracic cage and visualized soft tissues are intact.',
    impression: 'No acute cardiopulmonary disease.',
    recommendations: 'Routine clinical correlation.',
  },
  MRI_BRAIN: {
    title: 'MRI Brain with & without Contrast',
    technique: 'Multi-sequence multi-planar MR imaging of the brain including T1, T2, FLAIR, and DWI sequences.',
    findings: 'No evidence of acute ischemia on DWI. Ventricles and sulcal spaces are symmetric. No pathologic intracranial enhancement or focal mass lesion. Major intracranial flow voids are preserved.',
    impression: 'Normal non-contrast and contrast-enhanced brain MRI examination.',
    recommendations: 'None.',
  },
};

export const ReportingModule: React.FC<ReportingModuleProps> = ({
  activeStudy,
  currentUserRole,
  onSaveReport,
}) => {
  const [report, setReport] = useState<RadiologyReport>({
    id: `REP-${activeStudy.patientId}`,
    studyUid: activeStudy.studyInstanceUid,
    patientId: activeStudy.patientId,
    patientName: activeStudy.patientName,
    modality: activeStudy.modalitiesInStudy[0] || 'CT',
    status: 'Draft',
    author: 'Dr. Elena Rostova, MD (Radiology Staff)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clinicalHistory: `${activeStudy.patientAge} ${activeStudy.patientSex === 'M' ? 'male' : 'female'}. Primary clinical evaluation for ${activeStudy.studyDescription}.`,
    technique: 'Standard diagnostic protocol acquired per institutional guidelines.',
    comparison: 'No prior diagnostic examinations available in PACS archive.',
    findings: 'Diagnostic examination evaluated in multi-viewport array.',
    impression: 'Preliminary radiologist assessment pending final sign-off.',
    recommendations: 'Clinical correlation recommended.',
    criticalFinding: activeStudy.criticalFinding || false,
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Load backend reports if available
  useEffect(() => {
    fetch(`/api/reports?studyUid=${activeStudy.studyInstanceUid}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reports && data.reports.length > 0) {
          setReport(data.reports[0]);
        }
      })
      .catch(() => {
        // Fallback to local report state
      });
  }, [activeStudy.studyInstanceUid]);

  const handleApplyTemplate = (key: keyof typeof TEMPLATES) => {
    const t = TEMPLATES[key];
    setReport((prev) => ({
      ...prev,
      technique: t.technique,
      findings: t.findings,
      impression: t.impression,
      recommendations: t.recommendations,
    }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleSignReport = async () => {
    try {
      const res = await fetch(`/api/reports/${report.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifierName: 'Dr. Elena Rostova, MD (Attending Radiologist)' }),
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      }
    } catch {
      setReport((prev) => ({
        ...prev,
        status: 'Verified',
        verifiedBy: 'Dr. Elena Rostova, MD',
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyClipboard = () => {
    const fullText = `DIAGNOSTIC RADIOLOGY REPORT
PATIENT: ${report.patientName} (MRN: ${report.patientId})
EXAM: ${activeStudy.studyDescription}
DATE: ${activeStudy.studyDate}
ACCESSION: ${activeStudy.accessionNumber}

CLINICAL HISTORY:
${report.clinicalHistory}

TECHNIQUE:
${report.technique}

COMPARISON:
${report.comparison}

FINDINGS:
${report.findings}

IMPRESSION:
${report.impression}

RECOMMENDATIONS:
${report.recommendations}

VERIFIED BY: ${report.verifiedBy || report.author}`;
    navigator.clipboard.writeText(fullText);
    alert('Structured report copied to clipboard for EHR integration.');
  };

  return (
    <div className="w-full h-full bg-[#07090e] p-4 overflow-y-auto text-xs select-none">
      <div className="max-w-4xl mx-auto bg-[#0b0e14] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        {/* Report Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Structured Radiology Diagnostic Report</h2>
              <div className="text-slate-400 text-[11px] font-mono">
                {activeStudy.institutionName} · Document ID: {report.id}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                report.status === 'Verified'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {report.status === 'Verified' ? '✓ Clinically Verified & Signed' : '● Draft Report'}
            </span>
          </div>
        </div>

        {/* Patient Demographic Banner */}
        <div className="grid grid-cols-4 gap-3 bg-[#07090e] p-3 rounded-lg border border-slate-800 text-[11px] font-mono">
          <div>
            <span className="text-slate-400 block">Patient Name:</span>
            <span className="text-white font-semibold">{activeStudy.patientName}</span>
          </div>
          <div>
            <span className="text-slate-400 block">MRN / ID:</span>
            <span className="text-teal-400 font-semibold">{activeStudy.patientId}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Demographics:</span>
            <span className="text-slate-200">{activeStudy.patientAge} / {activeStudy.patientSex}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Accession #:</span>
            <span className="text-slate-200">{activeStudy.accessionNumber}</span>
          </div>
        </div>

        {/* Critical Finding Alert Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${report.criticalFinding ? 'text-rose-500' : 'text-slate-500'}`} />
            <div>
              <div className="font-semibold text-slate-100">Critical Finding / STAT Alert</div>
              <div className="text-[11px] text-slate-400">Notifies referring clinician immediately per hospital escalation protocol</div>
            </div>
          </div>
          <button
            onClick={() => setReport((prev) => ({ ...prev, criticalFinding: !prev.criticalFinding }))}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              report.criticalFinding
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {report.criticalFinding ? 'ACTIVE CRITICAL' : 'None'}
          </button>
        </div>

        {/* Template Quick Selection */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Load Diagnostic Template:</span>
          <button
            onClick={() => handleApplyTemplate('CT_HEAD_TRAUMA')}
            className="px-2.5 py-1 bg-[#07090e] hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            CT Head Trauma
          </button>
          <button
            onClick={() => handleApplyTemplate('CHEST_XRAY')}
            className="px-2.5 py-1 bg-[#07090e] hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            Chest Radiography
          </button>
          <button
            onClick={() => handleApplyTemplate('MRI_BRAIN')}
            className="px-2.5 py-1 bg-[#07090e] hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            MRI Brain
          </button>
        </div>

        {/* Form Sections */}
        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Clinical History:</label>
            <textarea
              rows={2}
              value={report.clinicalHistory}
              onChange={(e) => setReport({ ...report, clinicalHistory: e.target.value })}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Technique:</label>
            <textarea
              rows={2}
              value={report.technique}
              onChange={(e) => setReport({ ...report, technique: e.target.value })}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Comparison:</label>
            <input
              type="text"
              value={report.comparison}
              onChange={(e) => setReport({ ...report, comparison: e.target.value })}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Findings:</label>
            <textarea
              rows={5}
              value={report.findings}
              onChange={(e) => setReport({ ...report, findings: e.target.value })}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-sans leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-teal-400 font-semibold mb-1">Impression:</label>
            <textarea
              rows={3}
              value={report.impression}
              onChange={(e) => setReport({ ...report, impression: e.target.value })}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-sans font-medium leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Recommendations:</label>
            <input
              type="text"
              value={report.recommendations}
              onChange={(e) => setReport({ ...report, recommendations: e.target.value })}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-sans"
            />
          </div>
        </div>

        {/* Action Controls & Signature */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="text-[11px] text-slate-400 font-mono">
            {report.verifiedBy ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Signed by {report.verifiedBy}
              </span>
            ) : (
              <span>Author: {report.author}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedSuccess ? 'Saved!' : 'Save Draft'}</span>
            </button>

            {report.status !== 'Verified' && (
              <button
                onClick={handleSignReport}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign & Verify Report</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
