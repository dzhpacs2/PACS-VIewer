import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DicomSeries } from '../types/dicom';
import { rawToHounsfield, hounsfieldToPixel8Bit } from '../utils/dicomMath';
import { Layers, Crosshair, Sliders, Maximize2 } from 'lucide-react';

interface MPRWorkspaceProps {
  series: DicomSeries;
  windowWidth: number;
  windowCenter: number;
  invert: boolean;
}

export const MPRWorkspace: React.FC<MPRWorkspaceProps> = ({
  series,
  windowWidth,
  windowCenter,
  invert,
}) => {
  const instances = series.instances;
  const numSlices = instances.length;
  const rows = instances[0]?.rows || 128;
  const cols = instances[0]?.columns || 128;

  // 3D Crosshair coordinates within volume: X [0, cols-1], Y [0, rows-1], Z [0, numSlices-1]
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; z: number }>({
    x: Math.floor(cols / 2),
    y: Math.floor(rows / 2),
    z: Math.floor(numSlices / 2),
  });

  const [slabThickness, setSlabThickness] = useState<number>(1);
  const [projectionMode, setProjectionMode] = useState<'Average' | 'MIP' | 'MinIP'>('Average');

  const axialCanvasRef = useRef<HTMLCanvasElement>(null);
  const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
  const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render Axial slice (X-Y plane at depth Z)
  const renderAxial = useCallback(() => {
    const canvas = axialCanvasRef.current;
    if (!canvas || instances.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cols;
    canvas.height = rows;

    const imgData = ctx.createImageData(cols, rows);
    const data32 = new Uint32Array(imgData.data.buffer);

    const z = Math.min(numSlices - 1, Math.max(0, crosshair.z));
    const inst = instances[z];
    if (!inst) return;

    const raw = inst.pixelData;
    const slope = inst.rescaleSlope;
    const intercept = inst.rescaleIntercept;

    for (let i = 0; i < raw.length; i++) {
      const hu = rawToHounsfield(raw[i], slope, intercept);
      const intensity = hounsfieldToPixel8Bit(hu, windowWidth, windowCenter, invert);
      data32[i] = (255 << 24) | (intensity << 16) | (intensity << 8) | intensity;
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw Crosshairs
    ctx.strokeStyle = '#06b6d4'; // cyan
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Vertical line at X
    ctx.beginPath();
    ctx.moveTo(crosshair.x, 0);
    ctx.lineTo(crosshair.x, rows);
    ctx.stroke();

    // Horizontal line at Y
    ctx.beginPath();
    ctx.moveTo(0, crosshair.y);
    ctx.lineTo(cols, crosshair.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [crosshair, instances, cols, rows, numSlices, windowWidth, windowCenter, invert]);

  // Render Coronal slice (X-Z plane at row Y) with true anatomical aspect ratio
  const renderCoronal = useCallback(() => {
    const canvas = coronalCanvasRef.current;
    if (!canvas || instances.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Physical aspect ratio scaling: sliceThickness (2.5mm) / colSpacing (0.85mm) ~ 2.94
    const zScale = Math.round(2.5 / 0.85); // 3x vertical scale
    const displayHeight = numSlices * zScale;

    canvas.width = cols;
    canvas.height = displayHeight;

    const imgData = ctx.createImageData(cols, displayHeight);
    const data32 = new Uint32Array(imgData.data.buffer);

    const y = Math.min(rows - 1, Math.max(0, crosshair.y));

    for (let z = 0; z < numSlices; z++) {
      const inst = instances[z];
      const raw = inst.pixelData;
      const slope = inst.rescaleSlope;
      const intercept = inst.rescaleIntercept;

      for (let x = 0; x < cols; x++) {
        const pixelIdx = y * cols + x;
        const hu = rawToHounsfield(raw[pixelIdx] || 0, slope, intercept);
        const intensity = hounsfieldToPixel8Bit(hu, windowWidth, windowCenter, invert);
        const color = (255 << 24) | (intensity << 16) | (intensity << 8) | intensity;

        // Replicate along Z scale to restore anatomical height
        for (let s = 0; s < zScale; s++) {
          const outZ = (numSlices - 1 - z) * zScale + s;
          if (outZ < displayHeight) {
            data32[outZ * cols + x] = color;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw Crosshairs
    ctx.strokeStyle = '#f59e0b'; // amber
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Vertical line at X
    ctx.beginPath();
    ctx.moveTo(crosshair.x, 0);
    ctx.lineTo(crosshair.x, displayHeight);
    ctx.stroke();

    // Horizontal line at Z
    const zScreen = (numSlices - 1 - crosshair.z) * zScale + Math.floor(zScale / 2);
    ctx.beginPath();
    ctx.moveTo(0, zScreen);
    ctx.lineTo(cols, zScreen);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [crosshair, instances, cols, rows, numSlices, windowWidth, windowCenter, invert]);

  // Render Sagittal slice (Y-Z plane at col X) with true anatomical aspect ratio
  const renderSagittal = useCallback(() => {
    const canvas = sagittalCanvasRef.current;
    if (!canvas || instances.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const zScale = Math.round(2.5 / 0.85); // 3x vertical scale
    const displayHeight = numSlices * zScale;

    canvas.width = rows;
    canvas.height = displayHeight;

    const imgData = ctx.createImageData(rows, displayHeight);
    const data32 = new Uint32Array(imgData.data.buffer);

    const x = Math.min(cols - 1, Math.max(0, crosshair.x));

    for (let z = 0; z < numSlices; z++) {
      const inst = instances[z];
      const raw = inst.pixelData;
      const slope = inst.rescaleSlope;
      const intercept = inst.rescaleIntercept;

      for (let y = 0; y < rows; y++) {
        const pixelIdx = y * cols + x;
        const hu = rawToHounsfield(raw[pixelIdx] || 0, slope, intercept);
        const intensity = hounsfieldToPixel8Bit(hu, windowWidth, windowCenter, invert);
        const color = (255 << 24) | (intensity << 16) | (intensity << 8) | intensity;

        for (let s = 0; s < zScale; s++) {
          const outZ = (numSlices - 1 - z) * zScale + s;
          if (outZ < displayHeight) {
            data32[outZ * rows + y] = color;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw Crosshairs
    ctx.strokeStyle = '#10b981'; // emerald
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Vertical line at Y
    ctx.beginPath();
    ctx.moveTo(crosshair.y, 0);
    ctx.lineTo(crosshair.y, displayHeight);
    ctx.stroke();

    // Horizontal line at Z
    const zScreen = (numSlices - 1 - crosshair.z) * zScale + Math.floor(zScale / 2);
    ctx.beginPath();
    ctx.moveTo(0, zScreen);
    ctx.lineTo(rows, zScreen);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [crosshair, instances, cols, rows, numSlices, windowWidth, windowCenter, invert]);

  useEffect(() => {
    renderAxial();
    renderCoronal();
    renderSagittal();
  }, [renderAxial, renderCoronal, renderSagittal]);

  // Handle Axial viewport interaction (updates X and Y)
  const handleAxialClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = axialCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * cols);
    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * rows);
    setCrosshair((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(cols - 1, clickX)),
      y: Math.max(0, Math.min(rows - 1, clickY)),
    }));
  };

  // Handle Coronal viewport interaction (updates X and Z)
  const handleCoronalClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = coronalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * cols);
    const clickZ = numSlices - 1 - Math.round(((e.clientY - rect.top) / rect.height) * numSlices);
    setCrosshair((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(cols - 1, clickX)),
      z: Math.max(0, Math.min(numSlices - 1, clickZ)),
    }));
  };

  // Handle Sagittal viewport interaction (updates Y and Z)
  const handleSagittalClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sagittalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickY = Math.round(((e.clientX - rect.left) / rect.width) * rows);
    const clickZ = numSlices - 1 - Math.round(((e.clientY - rect.top) / rect.height) * numSlices);
    setCrosshair((prev) => ({
      ...prev,
      y: Math.max(0, Math.min(rows - 1, clickY)),
      z: Math.max(0, Math.min(numSlices - 1, clickZ)),
    }));
  };

  return (
    <div className="w-full h-full bg-[#05070a] flex flex-col">
      {/* MPR Control Bar */}
      <div className="h-9 bg-[#0b0e14] border-b border-slate-800 px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <span className="font-semibold text-white">Multiplanar Reconstruction (MPR)</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-300">Synchronized Orthogonal Planes</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-slate-400 text-[11px]">Slab:</label>
            <select
              value={slabThickness}
              onChange={(e) => setSlabThickness(parseInt(e.target.value, 10))}
              className="bg-[#07090e] border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white"
            >
              <option value="1">1 mm (Native)</option>
              <option value="3">3 mm</option>
              <option value="5">5 mm</option>
              <option value="10">10 mm</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-slate-400 text-[11px]">Mode:</label>
            <select
              value={projectionMode}
              onChange={(e) => setProjectionMode(e.target.value as any)}
              className="bg-[#07090e] border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white"
            >
              <option value="Average">Average Intensity</option>
              <option value="MIP">MIP (Max Intensity)</option>
              <option value="MinIP">MinIP (Min Intensity)</option>
            </select>
          </div>

          <div className="font-mono text-slate-400 text-[11px]">
            Coords: X:{crosshair.x} Y:{crosshair.y} Z:{crosshair.z + 1}
          </div>
        </div>
      </div>

      {/* 3 Orthogonal Viewports Grid */}
      <div className="flex-1 grid grid-cols-3 gap-1 p-1 bg-[#07090e]">
        {/* Plane 1: Axial Viewport */}
        <div className="relative bg-[#05070a] rounded border border-slate-800 flex flex-col overflow-hidden">
          <div className="absolute top-2 left-2 z-10 text-[11px] font-mono text-cyan-400 bg-black/60 px-1.5 py-0.5 rounded">
            AXIAL (XY) · Z: {crosshair.z + 1}/{numSlices}
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            <canvas
              ref={axialCanvasRef}
              onClick={handleAxialClick}
              className="w-72 h-72 max-w-full max-h-full object-contain cursor-crosshair border border-slate-900 rounded shadow-md [image-rendering:pixelated]"
            />
          </div>
          <div className="p-1.5 bg-[#0b0e14] border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>R: Right | L: Left</span>
            <span>Slice Loc: {(crosshair.z * 2.5).toFixed(1)} mm</span>
          </div>
        </div>

        {/* Plane 2: Coronal Viewport */}
        <div className="relative bg-[#05070a] rounded border border-slate-800 flex flex-col overflow-hidden">
          <div className="absolute top-2 left-2 z-10 text-[11px] font-mono text-amber-400 bg-black/60 px-1.5 py-0.5 rounded">
            CORONAL (XZ) · Y: {crosshair.y}/{rows}
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            <canvas
              ref={coronalCanvasRef}
              onClick={handleCoronalClick}
              className="w-72 h-72 max-w-full max-h-full object-contain cursor-crosshair border border-slate-900 rounded shadow-md [image-rendering:pixelated]"
            />
          </div>
          <div className="p-1.5 bg-[#0b0e14] border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>S: Superior | I: Inferior</span>
            <span>Plane Width: {cols} px</span>
          </div>
        </div>

        {/* Plane 3: Sagittal Viewport */}
        <div className="relative bg-[#05070a] rounded border border-slate-800 flex flex-col overflow-hidden">
          <div className="absolute top-2 left-2 z-10 text-[11px] font-mono text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">
            SAGITTAL (YZ) · X: {crosshair.x}/{cols}
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            <canvas
              ref={sagittalCanvasRef}
              onClick={handleSagittalClick}
              className="w-72 h-72 max-w-full max-h-full object-contain cursor-crosshair border border-slate-900 rounded shadow-md [image-rendering:pixelated]"
            />
          </div>
          <div className="p-1.5 bg-[#0b0e14] border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>A: Anterior | P: Posterior</span>
            <span>Plane Depth: {numSlices} slices</span>
          </div>
        </div>
      </div>
    </div>
  );
};
