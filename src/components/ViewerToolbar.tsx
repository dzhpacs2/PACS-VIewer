import React, { useState } from 'react';
import { 
  ToolType, 
  WindowLevelPreset 
} from '../types/dicom';
import { STANDARD_WL_PRESETS } from '../utils/dicomMath';
import { 
  Move, 
  ZoomIn, 
  SunMedium, 
  Ruler, 
  Compass, 
  GitCommit, 
  Square, 
  Circle, 
  Crosshair, 
  PenTool, 
  Type, 
  ArrowUpRight, 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Contrast, 
  RotateCcw as ResetIcon, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Sliders, 
  Trash2, 
  Tags,
  Download
} from 'lucide-react';

interface ViewerToolbarProps {
  activeTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
  windowWidth: number;
  windowCenter: number;
  onWindowLevelChange: (width: number, center: number) => void;
  onApplyPreset: (preset: WindowLevelPreset) => void;
  invert: boolean;
  onToggleInvert: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onResetView: () => void;
  isCinePlaying: boolean;
  onToggleCine: () => void;
  cineFps: number;
  onChangeCineFps: (fps: number) => void;
  currentSlice: number;
  totalSlices: number;
  onSliceStep: (direction: number) => void;
  onClearMeasurements: () => void;
  measurementCount: number;
  onOpenTagInspector: () => void;
}

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
  activeTool,
  onToolSelect,
  windowWidth,
  windowCenter,
  onWindowLevelChange,
  onApplyPreset,
  invert,
  onToggleInvert,
  onRotateCW,
  onRotateCCW,
  onFlipH,
  onFlipV,
  onResetView,
  isCinePlaying,
  onToggleCine,
  cineFps,
  onChangeCineFps,
  currentSlice,
  totalSlices,
  onSliceStep,
  onClearMeasurements,
  measurementCount,
  onOpenTagInspector,
}) => {
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [customWw, setCustomWw] = useState(windowWidth.toString());
  const [customWc, setCustomWc] = useState(windowCenter.toString());

  const handleCustomWlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(customWw);
    const c = parseFloat(customWc);
    if (!isNaN(w) && !isNaN(c)) {
      onWindowLevelChange(w, c);
    }
  };

  return (
    <div className="h-10 bg-[#0d111a] border-b border-slate-800 px-3 flex items-center justify-between text-xs select-none shrink-0 z-20">
      {/* Group 1: Navigation & Transform Tools */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToolSelect('pan')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'pan' ? 'bg-teal-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Pan (Drag canvas)"
        >
          <Move className="w-3.5 h-3.5" />
          <span>Pan</span>
        </button>

        <button
          onClick={() => onToolSelect('zoom')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'zoom' ? 'bg-teal-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Zoom (Drag vertically to scale)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span>Zoom</span>
        </button>

        <button
          onClick={() => onToolSelect('windowLevel')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'windowLevel' ? 'bg-teal-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Window / Level (Drag horizontally for Width, vertically for Center)"
        >
          <SunMedium className="w-3.5 h-3.5" />
          <span>W/L</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Window/Level Preset Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#07090e] border border-slate-800 text-slate-300 hover:text-white"
            title="Window / Level Presets (Lung, Bone, Brain, Soft Tissue, etc.)"
          >
            <Sliders className="w-3 h-3 text-teal-400" />
            <span className="font-mono text-[11px]">W:{windowWidth} L:{windowCenter}</span>
          </button>

          {showPresetMenu && (
            <div 
              className="absolute left-0 top-full mt-1 w-64 bg-[#0d111a] border border-slate-700 rounded-lg shadow-xl p-2 z-50 text-xs"
              onMouseLeave={() => setShowPresetMenu(false)}
            >
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 px-1">
                Diagnostic W/L Presets
              </div>
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {STANDARD_WL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      onApplyPreset(preset);
                      setCustomWw(preset.windowWidth.toString());
                      setCustomWc(preset.windowCenter.toString());
                      setShowPresetMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 flex items-center justify-between text-slate-200 group"
                  >
                    <div>
                      <div className="font-medium text-slate-100 group-hover:text-teal-300">{preset.name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{preset.description}</div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {preset.windowWidth}/{preset.windowCenter}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-800 mt-2 pt-2">
                <form onSubmit={handleCustomWlSubmit} className="flex items-center gap-1">
                  <input
                    type="number"
                    value={customWw}
                    onChange={(e) => setCustomWw(e.target.value)}
                    placeholder="Width"
                    className="w-16 bg-[#07090e] border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-white"
                  />
                  <input
                    type="number"
                    value={customWc}
                    onChange={(e) => setCustomWc(e.target.value)}
                    placeholder="Center"
                    className="w-16 bg-[#07090e] border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-white"
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-teal-600 text-white rounded text-[11px] font-medium hover:bg-teal-500"
                  >
                    Apply
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onToggleInvert}
          className={`p-1.5 rounded ${invert ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="Invert Grayscale (Negative/Positive)"
        >
          <Contrast className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRotateCCW}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Rotate 90° CCW"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRotateCW}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Rotate 90° CW"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onFlipH}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Flip Horizontal"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onFlipV}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Flip Vertical"
        >
          <FlipVertical className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onResetView}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Reset Transformations & Zoom to Fit"
        >
          <ResetIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Group 2: Diagnostic Measurement Tools */}
      <div className="flex items-center gap-1 bg-[#07090e] p-0.5 rounded border border-slate-800">
        <button
          onClick={() => onToolSelect('distance')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'distance' ? 'bg-teal-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Distance Caliper (Physical length in mm)"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Length</span>
        </button>

        <button
          onClick={() => onToolSelect('multisegment')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'multisegment' ? 'bg-teal-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Multi-segment Polyline (Total distance in mm)"
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>Polyline</span>
        </button>

        <button
          onClick={() => onToolSelect('angle')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'angle' ? 'bg-teal-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Angle (3-point vertex angle in degrees)"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Angle</span>
        </button>

        <button
          onClick={() => onToolSelect('cobbAngle')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'cobbAngle' ? 'bg-teal-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Cobb Angle (Spinal curvature intersection angle)"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Cobb</span>
        </button>

        <button
          onClick={() => onToolSelect('rectangleRoi')}
          className={`p-1.5 rounded transition-colors ${
            activeTool === 'rectangleRoi' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Rectangular ROI (Calculates Area mm², Mean HU, Min, Max, SD)"
        >
          <Square className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onToolSelect('ellipseRoi')}
          className={`p-1.5 rounded transition-colors ${
            activeTool === 'ellipseRoi' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Elliptical ROI (Calculates Area mm², Mean HU, Min, Max, SD)"
        >
          <Circle className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onToolSelect('pointProbe')}
          className={`p-1.5 rounded transition-colors ${
            activeTool === 'pointProbe' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Point Probe (Hounsfield Unit HU readout at cursor)"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onToolSelect('freehand')}
          className={`p-1.5 rounded transition-colors ${
            activeTool === 'freehand' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Freehand ROI Contour"
        >
          <PenTool className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onToolSelect('text')}
          className={`p-1.5 rounded transition-colors ${
            activeTool === 'text' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Text Annotation"
        >
          <Type className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onToolSelect('arrow')}
          className={`p-1.5 rounded transition-colors ${
            activeTool === 'arrow' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Arrow Pointer Annotation"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        {measurementCount > 0 && (
          <button
            onClick={onClearMeasurements}
            className="flex items-center gap-1 px-1.5 py-1 text-rose-400 hover:bg-rose-950/60 rounded transition-colors ml-1"
            title="Clear All Active Measurements on Instance"
          >
            <Trash2 className="w-3 h-3" />
            <span className="text-[10px] font-mono">({measurementCount})</span>
          </button>
        )}
      </div>

      {/* Group 3: Cine Stack Navigation & Metadata */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-[#07090e] px-2 py-0.5 rounded border border-slate-800">
          <button
            onClick={() => onSliceStep(-1)}
            disabled={currentSlice <= 1}
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
            title="Previous Slice / Frame"
          >
            <SkipBack className="w-3 h-3" />
          </button>

          <button
            onClick={onToggleCine}
            className={`p-1 rounded ${isCinePlaying ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
            title={isCinePlaying ? 'Pause Cine' : 'Play Cine Playback'}
          >
            {isCinePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>

          <button
            onClick={() => onSliceStep(1)}
            disabled={currentSlice >= totalSlices}
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
            title="Next Slice / Frame"
          >
            <SkipForward className="w-3 h-3" />
          </button>

          <span className="font-mono text-[11px] text-slate-300 ml-1">
            {currentSlice}/{totalSlices}
          </span>

          <div className="h-3 w-px bg-slate-800 mx-1" />

          <label className="text-[10px] text-slate-400">FPS:</label>
          <select
            value={cineFps}
            onChange={(e) => onChangeCineFps(parseInt(e.target.value, 10))}
            className="bg-transparent text-teal-400 font-mono text-[11px] focus:outline-none"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="24">24</option>
            <option value="30">30</option>
          </select>
        </div>

        <button
          onClick={onOpenTagInspector}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#07090e] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          title="Inspect Complete DICOM Header Tags (0008, 0010, 0020, 0028...)"
        >
          <Tags className="w-3.5 h-3.5 text-teal-400" />
          <span>DICOM Tags</span>
        </button>
      </div>
    </div>
  );
};
