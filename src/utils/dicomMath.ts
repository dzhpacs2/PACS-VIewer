import { RoiStatistics, WindowLevelPreset } from '../types/dicom';

export const STANDARD_WL_PRESETS: WindowLevelPreset[] = [
  { name: 'CT Lung', modality: 'CT', windowWidth: 1500, windowCenter: -600, description: 'Optimized for pulmonary parenchyma and airway inspection' },
  { name: 'CT Mediastinum', modality: 'CT', windowWidth: 350, windowCenter: 40, description: 'Evaluation of lymph nodes, great vessels, and heart' },
  { name: 'CT Bone', modality: 'CT', windowWidth: 1500, windowCenter: 300, description: 'Cortex, trabecular architecture, and skeletal trauma' },
  { name: 'CT Brain', modality: 'CT', windowWidth: 80, windowCenter: 40, description: 'Gray-white differentiation and acute intracranial lesions' },
  { name: 'CT Subdural', modality: 'CT', windowWidth: 150, windowCenter: 75, description: 'Subdural hematoma and extra-axial collection screening' },
  { name: 'CT Liver', modality: 'CT', windowWidth: 150, windowCenter: 50, description: 'Hepatic parenchyma, steatosis, and focal lesion contrast' },
  { name: 'CT Soft Tissue', modality: 'CT', windowWidth: 400, windowCenter: 50, description: 'General abdomen, pelvis, and musculature assessment' },
  { name: 'MR T1 / Neuro', modality: 'MR', windowWidth: 500, windowCenter: 250, description: 'Anatomical T1 sequence contrast standard' },
  { name: 'MR T2 / Fluid', modality: 'MR', windowWidth: 800, windowCenter: 400, description: 'High fluid signal differentiation for T2/FLAIR' },
  { name: 'CR/DX Chest X-Ray', modality: 'DX', windowWidth: 2048, windowCenter: 1024, description: 'Full dynamic range for digital chest radiography' },
];

/**
 * Converts stored raw pixel value into calibrated Hounsfield Units (HU)
 * HU = raw * RescaleSlope + RescaleIntercept
 */
export function rawToHounsfield(rawPixel: number, slope: number = 1, intercept: number = 0): number {
  return rawPixel * slope + intercept;
}

/**
 * Maps Hounsfield Unit or calibrated pixel value to 8-bit display grayscale [0, 255]
 * based on DICOM standard linear Window/Level formula:
 * If x <= (c - 0.5 - (w-1)/2), then y = ymin
 * Else if x > (c - 0.5 + (w-1)/2), then y = ymax
 * Else y = ((x - (c - 0.5)) / (w - 1) + 0.5) * (ymax - ymin) + ymin
 */
export function hounsfieldToPixel8Bit(
  val: number,
  windowWidth: number,
  windowCenter: number,
  invert: boolean = false
): number {
  const w = Math.max(1, windowWidth);
  const c = windowCenter;
  const minVal = c - 0.5 - (w - 1) / 2;
  const maxVal = c - 0.5 + (w - 1) / 2;

  let normalized: number;
  if (val <= minVal) {
    normalized = 0;
  } else if (val > maxVal) {
    normalized = 255;
  } else {
    normalized = Math.round(((val - (c - 0.5)) / (w - 1) + 0.5) * 255);
  }

  return invert ? 255 - normalized : normalized;
}

/**
 * Calculates physical linear distance in millimeters between two points
 * accounting for non-square pixel spacing [rowSpacing, colSpacing]
 */
export function calculateDistanceMm(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  pixelSpacing: [number, number] = [1, 1]
): number {
  const [rowSpacing, colSpacing] = pixelSpacing;
  const dx = (p2.x - p1.x) * colSpacing;
  const dy = (p2.y - p1.y) * rowSpacing;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.round(distance * 100) / 100;
}

/**
 * Calculates angle in degrees subtended by 3 points with a defined vertex
 */
export function calculateAngleDegrees(
  p1: { x: number; y: number },
  vertex: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleRad = Math.acos(cosTheta);
  return Math.round((angleRad * 180) / Math.PI * 10) / 10;
}

/**
 * Calculates the Cobb angle between two line segments (used in spinal scoliosis evaluation)
 */
export function calculateCobbAngle(
  line1Start: { x: number; y: number },
  line1End: { x: number; y: number },
  line2Start: { x: number; y: number },
  line2End: { x: number; y: number }
): number {
  const angle1 = Math.atan2(line1End.y - line1Start.y, line1End.x - line1Start.x);
  const angle2 = Math.atan2(line2End.y - line2Start.y, line2End.x - line2Start.x);

  let diffRad = Math.abs(angle1 - angle2);
  let diffDeg = (diffRad * 180) / Math.PI;

  if (diffDeg > 180) {
    diffDeg = 360 - diffDeg;
  }
  if (diffDeg > 90) {
    diffDeg = 180 - diffDeg;
  }

  return Math.round(diffDeg * 10) / 10;
}

/**
 * Calculates statistical metrics (Mean, Min, Max, StdDev, Area mm²)
 * over a collection of sampled pixel values
 */
export function calculateRoiStatistics(
  rawPixels: number[],
  slope: number = 1,
  intercept: number = 0,
  pixelSpacing: [number, number] = [1, 1]
): RoiStatistics {
  if (rawPixels.length === 0) {
    return { areaMm2: 0, meanHU: 0, minHU: 0, maxHU: 0, stdDevHU: 0 };
  }

  const [rowSpacing, colSpacing] = pixelSpacing;
  const pixelAreaMm2 = rowSpacing * colSpacing;
  const areaMm2 = Math.round(rawPixels.length * pixelAreaMm2 * 100) / 100;

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  const huValues: number[] = new Array(rawPixels.length);
  for (let i = 0; i < rawPixels.length; i++) {
    const hu = rawToHounsfield(rawPixels[i], slope, intercept);
    huValues[i] = hu;
    sum += hu;
    if (hu < min) min = hu;
    if (hu > max) max = hu;
  }

  const mean = sum / rawPixels.length;

  let varianceSum = 0;
  for (let i = 0; i < huValues.length; i++) {
    const diff = huValues[i] - mean;
    varianceSum += diff * diff;
  }

  const stdDev = Math.sqrt(varianceSum / rawPixels.length);

  return {
    areaMm2,
    meanHU: Math.round(mean * 10) / 10,
    minHU: Math.round(min * 10) / 10,
    maxHU: Math.round(max * 10) / 10,
    stdDevHU: Math.round(stdDev * 10) / 10,
  };
}

/**
 * Clamps coordinates within image dimensions
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
