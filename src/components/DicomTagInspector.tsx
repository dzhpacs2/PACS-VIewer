import React, { useState } from 'react';
import { DicomInstance } from '../types/dicom';
import { Search, Tags, Eye, EyeOff, X, Copy, Check } from 'lucide-react';

interface DicomTagInspectorProps {
  instance: DicomInstance;
  onClose: () => void;
}

export const DicomTagInspector: React.FC<DicomTagInspectorProps> = ({ instance, onClose }) => {
  const [filter, setFilter] = useState<string>('');
  const [anonymize, setAnonymize] = useState<boolean>(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const tags = instance.tags || [];

  const filteredTags = tags.filter((t) => {
    const q = filter.toLowerCase().trim();
    return (
      !q ||
      t.tag.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.value.toLowerCase().includes(q) ||
      t.vr.toLowerCase().includes(q)
    );
  });

  const getDisplayValue = (tag: string, name: string, rawVal: string) => {
    if (anonymize) {
      if (tag.includes('0010,0010') || name.toLowerCase().includes('patient name')) {
        return 'ANONYMIZED^PATIENT';
      }
      if (tag.includes('0010,0020') || name.toLowerCase().includes('patient id')) {
        return 'ANON-ID-XXXXX';
      }
      if (tag.includes('0010,0030') || name.toLowerCase().includes('birth date')) {
        return '19000101';
      }
    }
    return rawVal;
  };

  const handleCopy = (text: string, tagKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTag(tagKey);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0b0e14] border border-slate-700 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-[#0d111a] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                DICOM Header Metadata Tag Inspector
              </h2>
              <div className="text-slate-400 text-[11px] font-mono">
                Instance #{instance.instanceNumber} · SOP: {instance.sopInstanceUid}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Anonymize Toggle */}
            <button
              onClick={() => setAnonymize(!anonymize)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                anonymize
                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {anonymize ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{anonymize ? 'Anonymized Mode' : 'PHI Visible'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-3 bg-[#07090e] border-b border-slate-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by Tag (e.g. 0010,0010), Element Name, VR, or Value..."
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
          <span className="font-mono text-slate-400 text-[11px]">
            {filteredTags.length} of {tags.length} tags
          </span>
        </div>

        {/* Tag Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#07090e] border-b border-slate-800 text-slate-400 text-[11px] font-semibold font-mono sticky top-0 z-10">
                <th className="py-2 px-3 w-36">Tag (Group,Elem)</th>
                <th className="py-2 px-3 w-16">VR</th>
                <th className="py-2 px-3 w-64">Element Name</th>
                <th className="py-2 px-3">Value</th>
                <th className="py-2 px-3 text-right w-16">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredTags.map((t) => {
                const displayVal = getDisplayValue(t.tag, t.name, t.value);
                return (
                  <tr key={t.tag} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                    <td className="py-2 px-3 text-teal-400 font-bold">{t.tag}</td>
                    <td className="py-2 px-3 text-slate-400">{t.vr}</td>
                    <td className="py-2 px-3 text-slate-200 font-sans">{t.name}</td>
                    <td className="py-2 px-3 text-white break-all">{displayVal}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleCopy(`${t.tag} ${t.name}: ${displayVal}`, t.tag)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Copy tag and value"
                      >
                        {copiedTag === t.tag ? (
                          <Check className="w-3.5 h-3.5 text-teal-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
