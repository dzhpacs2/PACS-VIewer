import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  DicomStudy, 
  DicomSeries, 
  DicomInstance, 
  ToolType, 
  Measurement, 
  Point2D, 
  DistanceMeasurement, 
  AngleMeasurement, 
  CobbAngleMeasurement, 
  RectRoiMeasurement, 
  EllipseRoiMeasurement, 
  PointProbeMeasurement, 
  FreehandMeasurement, 
  AnnotationText, 
  AnnotationArrow 
} from '../types/dicom';
import { 
  hounsfieldToPixel8Bit, 
  rawToHounsfield, 
  calculateDistanceMm, 
  calculateAngleDegrees, 
  calculateCobbAngle, 
  calculateRoiStatistics 
} from '../utils/dicomMath';

interface MedicalViewportProps {
  viewportId: string;
  study: DicomStudy;
  series: DicomSeries;
  currentInstanceIndex: number;
  onSliceChange: (index: number) => void;
  activeTool: ToolType;
  windowWidth: number;
  windowCenter: number;
  onWindowLevelChange: (width: number, center: number) => void;
  invert: boolean;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  measurements: Measurement[];
  onAddMeasurement: (m: Measurement) => void;
  isActive: boolean;
  onSelectViewport: () => void;
}

export const MedicalViewport: React.FC<MedicalViewportProps> = ({
  viewportId,
  study,
  series,
  currentInstanceIndex,
  onSliceChange,
  activeTool,
  windowWidth,
  windowCenter,
  onWindowLevelChange,
  invert,
  rotation,
  flipH,
  flipV,
  measurements,
  onAddMeasurement,
  isActive,
  onSelectViewport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const instance = series.instances[currentInstanceIndex] || series.instances[0];

  // Viewport transformation states
  const [zoom, setZoom] = useState<number>(3.5);
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });

  // Hover probe coordinates & HU
  const [hoverHu, setHoverHu] = useState<{ x: number; y: number; hu: number; raw: number } | null>(null);

  // Auto-fit zoom on mount or series change
  useEffect(() => {
    if (containerRef.current && instance) {
      const containerH = containerRef.current.clientHeight || 600;
      const fitZoom = Math.max(1.0, Math.min(6.0, (containerH * 0.75) / instance.rows));
      setZoom(fitZoom);
      setPan({ x: 0, y: 0 });
    }
  }, [series.seriesInstanceUid, instance?.rows]);

  // Drawing in-progress states
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Point2D | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point2D | null>(null);

  // Multi-step measurement points (e.g., angle requires 3 clicks, Cobb angle requires 4)
  const [tempPoints, setTempPoints] = useState<Point2D[]>([]);

  // Map screen client coordinates to DICOM image pixel coordinates
  const screenToImageCoord = useCallback((screenX: number, screenY: number): Point2D => {
    const canvas = canvasRef.current;
    if (!canvas || !instance) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const mouseX = screenX - rect.left;
    const mouseY = screenY - rect.top;

    // Undo translation & scaling
    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;

    const relX = (mouseX - centerX) / zoom;
    const relY = (mouseY - centerY) / zoom;

    // Undo rotation
    const rad = (-rotation * Math.PI) / 180;
    const rotX = relX * Math.cos(rad) - relY * Math.sin(rad);
    const rotY = relX * Math.sin(rad) + relY * Math.cos(rad);

    // Undo flip
    const finalRelX = flipH ? -rotX : rotX;
    const finalRelY = flipV ? -rotY : rotY;

    const imgX = Math.round(finalRelX + instance.columns / 2);
    const imgY = Math.round(finalRelY + instance.rows / 2);

    return {
      x: Math.max(0, Math.min(instance.columns - 1, imgX)),
      y: Math.max(0, Math.min(instance.rows - 1, imgY)),
    };
  }, [pan, zoom, rotation, flipH, flipV, instance]);

  // Render DICOM image on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !instance) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas dimensions match container
    if (containerRef.current) {
      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
    }

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center origin
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Create offscreen image buffer for current DICOM instance
    const imgWidth = instance.columns;
    const imgHeight = instance.rows;
    const imgData = ctx.createImageData(imgWidth, imgHeight);
    const data32 = new Uint32Array(imgData.data.buffer);

    const rawPixels = instance.pixelData;
    const slope = instance.rescaleSlope;
    const intercept = instance.rescaleIntercept;

    for (let i = 0; i < rawPixels.length; i++) {
      const raw = rawPixels[i];
      const hu = rawToHounsfield(raw, slope, intercept);
      const intensity = hounsfieldToPixel8Bit(hu, windowWidth, windowCenter, invert);
      // RGBA Little-Endian: AABBGGRR
      data32[i] = (255 << 24) | (intensity << 16) | (intensity << 8) | intensity;
    }

    // Create bitmap and draw
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = imgWidth;
    offscreenCanvas.height = imgHeight;
    const offCtx = offscreenCanvas.getContext('2d');
    if (offCtx) {
      offCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(offscreenCanvas, -imgWidth / 2, -imgHeight / 2);
    }

    // Draw active measurements in image coordinates
    ctx.translate(-imgWidth / 2, -imgHeight / 2);

    measurements.forEach((m) => {
      ctx.lineWidth = 1.5 / zoom;
      ctx.strokeStyle = m.color || '#14b8a6'; // teal-500
      ctx.fillStyle = m.color || '#14b8a6';
      ctx.font = `${Math.max(10, 12 / zoom)}px monospace`;

      if (m.type === 'distance') {
        const dist = m as DistanceMeasurement;
        ctx.beginPath();
        ctx.moveTo(dist.start.x, dist.start.y);
        ctx.lineTo(dist.end.x, dist.end.y);
        ctx.stroke();

        // Draw cross ticks at ends
        ctx.fillRect(dist.start.x - 2 / zoom, dist.start.y - 2 / zoom, 4 / zoom, 4 / zoom);
        ctx.fillRect(dist.end.x - 2 / zoom, dist.end.y - 2 / zoom, 4 / zoom, 4 / zoom);

        const midX = (dist.start.x + dist.end.x) / 2;
        const midY = (dist.start.y + dist.end.y) / 2;
        ctx.fillText(`${dist.lengthMm.toFixed(1)} mm`, midX + 4 / zoom, midY - 4 / zoom);
      } else if (m.type === 'angle') {
        const ang = m as AngleMeasurement;
        ctx.beginPath();
        ctx.moveTo(ang.p1.x, ang.p1.y);
        ctx.lineTo(ang.vertex.x, ang.vertex.y);
        ctx.lineTo(ang.p2.x, ang.p2.y);
        ctx.stroke();
        ctx.fillText(`${ang.angleDegrees.toFixed(1)}°`, ang.vertex.x + 6 / zoom, ang.vertex.y - 6 / zoom);
      } else if (m.type === 'cobbAngle') {
        const cobb = m as CobbAngleMeasurement;
        ctx.beginPath();
        ctx.moveTo(cobb.line1Start.x, cobb.line1End.y);
        ctx.lineTo(cobb.line1End.x, cobb.line1End.y);
        ctx.moveTo(cobb.line2Start.x, cobb.line2Start.y);
        ctx.lineTo(cobb.line2End.x, cobb.line2End.y);
        ctx.stroke();
        ctx.fillText(`Cobb: ${cobb.cobbAngleDegrees.toFixed(1)}°`, cobb.line1End.x + 6 / zoom, cobb.line1End.y);
      } else if (m.type === 'rectangleRoi') {
        const roi = m as RectRoiMeasurement;
        const minX = Math.min(roi.topLeft.x, roi.bottomRight.x);
        const minY = Math.min(roi.topLeft.y, roi.bottomRight.y);
        const w = Math.abs(roi.bottomRight.x - roi.topLeft.x);
        const h = Math.abs(roi.bottomRight.y - roi.topLeft.y);

        ctx.strokeRect(minX, minY, w, h);
        ctx.fillText(
          `Area: ${roi.stats.areaMm2} mm² | Mean: ${roi.stats.meanHU} HU (±${roi.stats.stdDevHU})`,
          minX,
          minY - 4 / zoom
        );
      } else if (m.type === 'ellipseRoi') {
        const ell = m as EllipseRoiMeasurement;
        ctx.beginPath();
        ctx.ellipse(ell.center.x, ell.center.y, ell.radiusX, ell.radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(
          `Mean: ${ell.stats.meanHU} HU [${ell.stats.minHU} to ${ell.stats.maxHU}]`,
          ell.center.x - ell.radiusX,
          ell.center.y - ell.radiusY - 4 / zoom
        );
      } else if (m.type === 'pointProbe') {
        const probe = m as PointProbeMeasurement;
        ctx.beginPath();
        ctx.arc(probe.point.x, probe.point.y, 3 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(`${probe.huValue} HU`, probe.point.x + 6 / zoom, probe.point.y + 4 / zoom);
      } else if (m.type === 'text') {
        const txt = m as AnnotationText;
        ctx.fillText(txt.text, txt.point.x, txt.point.y);
      }
    });

    // Draw active drawing preview
    if (isInteracting && dragStart && currentMousePos) {
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 1.5 / zoom;
      ctx.fillStyle = '#38bdf8';
      ctx.font = `${Math.max(10, 12 / zoom)}px monospace`;

      if (activeTool === 'distance') {
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(currentMousePos.x, currentMousePos.y);
        ctx.stroke();
        const distMm = calculateDistanceMm(dragStart, currentMousePos, instance.pixelSpacing);
        ctx.fillText(`${distMm.toFixed(1)} mm`, currentMousePos.x + 5 / zoom, currentMousePos.y - 5 / zoom);
      } else if (activeTool === 'rectangleRoi') {
        const minX = Math.min(dragStart.x, currentMousePos.x);
        const minY = Math.min(dragStart.y, currentMousePos.y);
        const w = Math.abs(currentMousePos.x - dragStart.x);
        const h = Math.abs(currentMousePos.y - dragStart.y);
        ctx.strokeRect(minX, minY, w, h);
      }
    }

    ctx.restore();
  }, [
    instance,
    pan,
    zoom,
    rotation,
    flipH,
    flipV,
    windowWidth,
    windowCenter,
    invert,
    measurements,
    isInteracting,
    dragStart,
    currentMousePos,
    activeTool,
  ]);

  // Handle mouse wheel for slice navigation
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (series.instances.length <= 1) return;

    if (e.deltaY > 0) {
      // Next slice
      if (currentInstanceIndex < series.instances.length - 1) {
        onSliceChange(currentInstanceIndex + 1);
      }
    } else {
      // Previous slice
      if (currentInstanceIndex > 0) {
        onSliceChange(currentInstanceIndex - 1);
      }
    }
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    onSelectViewport();
    const imgCoord = screenToImageCoord(e.clientX, e.clientY);

    if (activeTool === 'pan' || activeTool === 'zoom' || activeTool === 'windowLevel') {
      setIsInteracting(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (activeTool === 'pointProbe') {
      const idx = imgCoord.y * instance.columns + imgCoord.x;
      const raw = instance.pixelData[idx] || 0;
      const hu = rawToHounsfield(raw, instance.rescaleSlope, instance.rescaleIntercept);
      onAddMeasurement({
        id: `probe-${Date.now()}`,
        type: 'pointProbe',
        instanceUid: instance.sopInstanceUid,
        point: imgCoord,
        huValue: Math.round(hu),
        rawValue: raw,
        color: '#f59e0b',
      });
      return;
    }

    if (activeTool === 'text') {
      const input = window.prompt('Enter annotation text:', 'Lesion / Finding');
      if (input) {
        onAddMeasurement({
          id: `text-${Date.now()}`,
          type: 'text',
          instanceUid: instance.sopInstanceUid,
          point: imgCoord,
          text: input,
          color: '#38bdf8',
        });
      }
      return;
    }

    if (activeTool === 'angle') {
      const updated = [...tempPoints, imgCoord];
      if (updated.length === 3) {
        const deg = calculateAngleDegrees(updated[0], updated[1], updated[2]);
        onAddMeasurement({
          id: `ang-${Date.now()}`,
          type: 'angle',
          instanceUid: instance.sopInstanceUid,
          p1: updated[0],
          vertex: updated[1],
          p2: updated[2],
          angleDegrees: deg,
          color: '#a855f7',
        });
        setTempPoints([]);
      } else {
        setTempPoints(updated);
      }
      return;
    }

    setIsInteracting(true);
    setDragStart(imgCoord);
    setCurrentMousePos(imgCoord);
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const imgCoord = screenToImageCoord(e.clientX, e.clientY);

    // Update hover probe info
    if (instance) {
      const idx = imgCoord.y * instance.columns + imgCoord.x;
      const raw = instance.pixelData[idx] || 0;
      const hu = rawToHounsfield(raw, instance.rescaleSlope, instance.rescaleIntercept);
      setHoverHu({ x: imgCoord.x, y: imgCoord.y, hu: Math.round(hu), raw });
    }

    if (!isInteracting || !dragStart) return;

    if (activeTool === 'pan') {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (activeTool === 'zoom') {
      const dy = e.clientY - dragStart.y;
      setZoom((prev) => Math.max(0.2, Math.min(8.0, prev - dy * 0.01)));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (activeTool === 'windowLevel') {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      onWindowLevelChange(
        Math.max(1, Math.round(windowWidth + dx * 2)),
        Math.round(windowCenter - dy * 2)
      );
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    setCurrentMousePos(imgCoord);
  };

  // Mouse Up
  const handleMouseUp = () => {
    if (!isInteracting || !dragStart || !currentMousePos) {
      setIsInteracting(false);
      setDragStart(null);
      setCurrentMousePos(null);
      return;
    }

    if (activeTool === 'distance') {
      const dist = calculateDistanceMm(dragStart, currentMousePos, instance.pixelSpacing);
      if (dist > 1) {
        onAddMeasurement({
          id: `dist-${Date.now()}`,
          type: 'distance',
          instanceUid: instance.sopInstanceUid,
          start: dragStart,
          end: currentMousePos,
          lengthMm: dist,
          color: '#14b8a6',
        });
      }
    } else if (activeTool === 'rectangleRoi') {
      const minX = Math.min(dragStart.x, currentMousePos.x);
      const maxX = Math.max(dragStart.x, currentMousePos.x);
      const minY = Math.min(dragStart.y, currentMousePos.y);
      const maxY = Math.max(dragStart.y, currentMousePos.y);

      // Sample pixels in box
      const sampled: number[] = [];
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = y * instance.columns + x;
          if (idx >= 0 && idx < instance.pixelData.length) {
            sampled.push(instance.pixelData[idx]);
          }
        }
      }

      if (sampled.length > 4) {
        const stats = calculateRoiStatistics(
          sampled,
          instance.rescaleSlope,
          instance.rescaleIntercept,
          instance.pixelSpacing
        );
        onAddMeasurement({
          id: `rect-${Date.now()}`,
          type: 'rectangleRoi',
          instanceUid: instance.sopInstanceUid,
          topLeft: { x: minX, y: minY },
          bottomRight: { x: maxX, y: maxY },
          stats,
          color: '#38bdf8',
        });
      }
    }

    setIsInteracting(false);
    setDragStart(null);
    setCurrentMousePos(null);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative w-full h-full overflow-hidden bg-[#05070a] medical-canvas-container ${
        isActive ? 'ring-1 ring-teal-500' : 'ring-1 ring-slate-800'
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* DICOM Standard Corner Overlays */}
      {/* Top-Left: Patient Information */}
      <div className="absolute top-2 left-2 pointer-events-none text-[11px] font-mono leading-tight text-teal-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] select-none">
        <div className="font-bold text-white text-xs">{study.patientName}</div>
        <div>ID: {study.patientId}</div>
        <div>DOB: {study.patientBirthDate || 'N/A'} ({study.patientAge} / {study.patientSex})</div>
      </div>

      {/* Top-Right: Study & Institution Information */}
      <div className="absolute top-2 right-2 pointer-events-none text-[11px] font-mono text-right leading-tight text-teal-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] select-none">
        <div className="font-semibold text-white">{study.institutionName}</div>
        <div>Date: {study.studyDate} {study.studyTime}</div>
        <div className="text-slate-300">{study.studyDescription}</div>
        <div className="text-[10px] text-slate-400">Ref: {study.referringPhysician}</div>
      </div>

      {/* Bottom-Left: Acquisition, Slice & Series Details */}
      <div className="absolute bottom-2 left-2 pointer-events-none text-[11px] font-mono leading-tight text-teal-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] select-none">
        <div className="font-semibold text-teal-400">
          {series.modality} · {series.seriesDescription}
        </div>
        <div>
          Slice: {currentInstanceIndex + 1}/{series.instances.length}
          {instance?.sliceLocation !== undefined && ` · Loc: ${instance.sliceLocation.toFixed(1)} mm`}
        </div>
        <div>
          Thick: {instance?.sliceThickness?.toFixed(1) || '1.0'} mm · {instance?.columns}x{instance?.rows}
        </div>
      </div>

      {/* Bottom-Right: Calibration, Window/Level & Zoom */}
      <div className="absolute bottom-2 right-2 pointer-events-none text-[11px] font-mono text-right leading-tight text-teal-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] select-none">
        {hoverHu && (
          <div className="text-amber-400 font-semibold mb-0.5">
            X:{hoverHu.x} Y:{hoverHu.y} · {hoverHu.hu} HU
          </div>
        )}
        <div className="font-bold text-white">
          W: {windowWidth}  L: {windowCenter}
        </div>
        <div>
          Zoom: {(zoom * 100).toFixed(0)}%
          {rotation !== 0 && ` · Rot: ${rotation}°`}
          {invert && ' · [INV]'}
        </div>
        <div className="text-[10px] text-slate-400">
          Pixel: {instance?.pixelSpacing[0]}x{instance?.pixelSpacing[1]} mm
        </div>
      </div>
    </div>
  );
};
