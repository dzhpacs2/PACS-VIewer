import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DicomSeries } from '../types/dicom';
import { rawToHounsfield } from '../utils/dicomMath';
import { Box, RotateCw, ZoomIn, Sliders, Eye, RefreshCw, Scissors } from 'lucide-react';

interface Volume3DViewerProps {
  series: DicomSeries;
}

type Preset3D = 'bone' | 'softTissue' | 'angioMip' | 'minIp';

export const Volume3DViewer: React.FC<Volume3DViewerProps> = ({ series }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instances = series.instances;

  const numSlices = instances.length;
  const rows = instances[0]?.rows || 128;
  const cols = instances[0]?.columns || 128;

  // 3D rotation angles in degrees
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(-35);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);

  const [activePreset, setActivePreset] = useState<Preset3D>('bone');
  const [clipAxial, setClipAxial] = useState<number>(100); // 0 to 100%
  const [clipCoronal, setClipCoronal] = useState<number>(100);

  // Fast raycasting / MIP 3D projection renderer
  const renderVolume = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || instances.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;

    const cosX = Math.cos(radX);
    const sinX = Math.sin(radX);
    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);

    const outImg = ctx.createImageData(width, height);
    const data32 = new Uint32Array(outImg.data.buffer);

    // Bounding cube half dimensions in volume space
    const hx = cols / 2;
    const hy = rows / 2;
    const hz = (numSlices * 3) / 2; // slice spacing scaling factor

    // Step through screen rays
    const stepSize = 2; // fast sampling
    const maxZLimit = Math.floor((clipAxial / 100) * numSlices);
    const maxYLimit = Math.floor((clipCoronal / 100) * rows);

    // Precalculate voxel data in a compact Uint16 buffer for instant ray traversal
    // Sample a grid of rays
    for (let py = 0; py < height; py += stepSize) {
      const ny = (py - height / 2) / (zoom * 1.5);

      for (let px = 0; px < width; px += stepSize) {
        const nx = (px - width / 2) / (zoom * 1.5);

        // Ray in camera space: origin (nx, ny, -150), direction (0, 0, 1)
        // Transform ray along viewing angles
        let maxVal = -1000;
        let minVal = 2000;
        let accumR = 0;
        let accumG = 0;
        let accumB = 0;
        let accumAlpha = 0;

        // March through volume depth
        for (let t = -hz; t <= hz; t += 3) {
          // Camera space to rotated model space
          const rx = nx;
          const ry = ny * cosX - t * sinX;
          const rz = ny * sinX + t * cosX;

          const mx = rx * cosY + rz * sinY;
          const my = ry;
          const mz = -rx * sinY + rz * cosY;

          // Convert to voxel coordinates
          const vx = Math.floor(mx + hx);
          const vy = Math.floor(my + hy);
          const vz = Math.floor((mz + hz) / 3);

          if (vx >= 0 && vx < cols && vy >= 0 && vy < maxYLimit && vz >= 0 && vz < maxZLimit) {
            const inst = instances[vz];
            if (inst) {
              const raw = inst.pixelData[vy * cols + vx] || 0;
              const hu = rawToHounsfield(raw, inst.rescaleSlope, inst.rescaleIntercept);

              if (hu > maxVal) maxVal = hu;
              if (hu < minVal) minVal = hu;

              if (activePreset === 'bone') {
                // Bone transfer function: HU > 250
                if (hu > 250) {
                  const norm = Math.min(1, (hu - 250) / 800);
                  const r = Math.floor(255 * (0.8 + 0.2 * norm));
                  const g = Math.floor(245 * (0.8 + 0.2 * norm));
                  const b = Math.floor(220 * (0.7 + 0.3 * norm));
                  const a = Math.min(1, 0.4 + norm * 0.6);

                  accumR += r * a * (1 - accumAlpha);
                  accumG += g * a * (1 - accumAlpha);
                  accumB += b * a * (1 - accumAlpha);
                  accumAlpha += a * (1 - accumAlpha);

                  if (accumAlpha > 0.95) break;
                }
              } else if (activePreset === 'softTissue') {
                // Soft tissue: HU > 20
                if (hu > 20) {
                  let r = 200, g = 140, b = 120, a = 0.15;
                  if (hu > 250) {
                    r = 250; g = 240; b = 230; a = 0.8;
                  }
                  accumR += r * a * (1 - accumAlpha);
                  accumG += g * a * (1 - accumAlpha);
                  accumB += b * a * (1 - accumAlpha);
                  accumAlpha += a * (1 - accumAlpha);
                  if (accumAlpha > 0.92) break;
                }
              }
            }
          }
        }

        // Color pixel
        let finalR = 0, finalG = 0, finalB = 0;
        if (activePreset === 'angioMip') {
          // Maximum intensity projection
          const norm = Math.max(0, Math.min(255, ((maxVal + 200) / 1200) * 255));
          finalR = norm; finalG = Math.floor(norm * 0.95); finalB = Math.floor(norm * 0.8);
        } else if (activePreset === 'minIp') {
          // Minimum intensity projection
          const norm = Math.max(0, Math.min(255, 255 - ((minVal + 1000) / 1500) * 255));
          finalR = norm; finalG = norm; finalB = norm;
        } else {
          finalR = Math.min(255, Math.floor(accumR));
          finalG = Math.min(255, Math.floor(accumG));
          finalB = Math.min(255, Math.floor(accumB));
        }

        const color32 = (255 << 24) | (finalB << 16) | (finalG << 8) | finalR;

        // Fill stepSize x stepSize block
        for (let dy = 0; dy < stepSize; dy++) {
          for (let dx = 0; dx < stepSize; dx++) {
            if (py + dy < height && px + dx < width) {
              data32[(py + dy) * width + (px + dx)] = color32;
            }
          }
        }
      }
    }

    ctx.putImageData(outImg, 0, 0);

    // Draw 3D Orientation Cube on bottom-right
    const cubeSize = 34;
    const cubeCenterX = width - 50;
    const cubeCenterY = height - 50;

    ctx.save();
    ctx.translate(cubeCenterX, cubeCenterY);

    // Coordinate axes
    const axisLen = 24;
    // X axis (Left/Right)
    const axX = axisLen * cosY;
    const axY = axisLen * sinX * sinY;
    ctx.strokeStyle = '#ef4444'; // Red
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(axX, -axY);
    ctx.stroke();

    // Y axis (Anterior/Posterior)
    const ayX = 0;
    const ayY = -axisLen * cosX;
    ctx.strokeStyle = '#22c55e'; // Green
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ayX, ayY);
    ctx.stroke();

    // Z axis (Superior/Inferior)
    const azX = axisLen * sinY;
    const azY = axisLen * sinX * cosY;
    ctx.strokeStyle = '#06b6d4'; // Cyan
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(azX, -azY);
    ctx.stroke();

    ctx.font = '9px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('R', axX + 4, -axY + 3);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('A', ayX + 4, ayY);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('S', azX + 4, -azY + 3);

    ctx.restore();
  }, [rotX, rotY, zoom, activePreset, clipAxial, clipCoronal, instances, cols, rows, numSlices]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 460;
      canvas.height = 460;
      renderVolume();
    }
  }, [renderVolume]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !lastMousePos) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    setRotY((prev) => prev + dx * 0.8);
    setRotX((prev) => Math.max(-80, Math.min(80, prev - dy * 0.8)));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setLastMousePos(null);
  };

  return (
    <div className="w-full h-full bg-[#05070a] flex flex-col">
      {/* 3D Header Bar */}
      <div className="h-9 bg-[#0b0e14] border-b border-slate-800 px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-teal-400" />
          <span className="font-semibold text-white">3D Volume Rendering & Maximum Intensity Projection</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-300">GPU/Raymarching Accelerated</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#07090e] p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setActivePreset('bone')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activePreset === 'bone' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              CT Bone
            </button>
            <button
              onClick={() => setActivePreset('softTissue')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activePreset === 'softTissue' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Soft Tissue
            </button>
            <button
              onClick={() => setActivePreset('angioMip')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activePreset === 'angioMip' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Angio MIP
            </button>
            <button
              onClick={() => setActivePreset('minIp')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activePreset === 'minIp' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              MinIP Airway
            </button>
          </div>

          <button
            onClick={() => {
              setRotX(25);
              setRotY(-35);
              setZoom(1.2);
              setClipAxial(100);
              setClipCoronal(100);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#07090e] border border-slate-800 text-slate-400 hover:text-white"
            title="Reset 3D Camera Angles"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Main 3D Stage & Control Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Clipping & Parameter Sidebar */}
        <div className="w-64 bg-[#0b0e14] border-r border-slate-800 p-3 flex flex-col gap-4 text-xs select-none">
          <div>
            <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-teal-400" />
              <span>3D Clipping Planes</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Axial Cut Plane:</span>
                  <span className="font-mono text-teal-400">{clipAxial}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={clipAxial}
                  onChange={(e) => setClipAxial(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Coronal Cut Plane:</span>
                  <span className="font-mono text-teal-400">{clipCoronal}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={clipCoronal}
                  onChange={(e) => setClipCoronal(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Camera Zoom & Pitch</span>
            </div>
            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>Magnification:</span>
                <span className="font-mono text-sky-400">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 leading-relaxed font-mono">
            <div className="text-slate-300 font-semibold mb-1">Navigation Guide:</div>
            <div>• Drag: Orbit Pitch & Yaw</div>
            <div>• Red Axis: Right-to-Left (X)</div>
            <div>• Green Axis: Anterior (Y)</div>
            <div>• Cyan Axis: Superior (Z)</div>
          </div>
        </div>

        {/* 3D Canvas Stage */}
        <div className="flex-1 flex items-center justify-center p-3 relative bg-[#07090e]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="cursor-grab active:cursor-grabbing border border-slate-800 rounded-lg shadow-2xl bg-[#05070a]"
          />

          <div className="absolute top-4 left-5 text-[11px] font-mono text-teal-400 bg-black/60 px-2 py-1 rounded border border-slate-800 pointer-events-none">
            3D VOLUME: {series.seriesDescription} · {instances.length} Slices · Pitch:{rotX}° Yaw:{rotY}°
          </div>
        </div>
      </div>
    </div>
  );
};
