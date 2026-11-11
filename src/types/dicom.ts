export type ModalityType = 'CT' | 'MR' | 'CR' | 'DX' | 'US' | 'MG' | 'PET' | 'NM' | 'XA' | 'RF' | 'SC' | 'ECG' | 'SR';

export type UserRole = 
  | 'Radiologist' 
  | 'PACS Administrator' 
  | 'System Administrator' 
  | 'Referring Physician' 
  | 'Technician' 
  | 'Read-only User';

export type ToolType = 
  | 'pan' 
  | 'zoom' 
  | 'windowLevel' 
  | 'distance' 
  | 'multisegment'
  | 'angle' 
  | 'cobbAngle' 
  | 'rectangleRoi' 
  | 'ellipseRoi' 
  | 'pointProbe' 
  | 'freehand'
  | 'text' 
  | 'arrow';

export type LayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '3x3' | 'mpr' | '3d';

export interface WindowLevelPreset {
  name: string;
  modality: ModalityType | 'ALL';
  windowWidth: number;
  windowCenter: number;
  description: string;
}

export interface DicomTag {
  tag: string; // e.g. '(0010,0010)'
  group: string;
  element: string;
  vr: string; // Value Representation (PN, DA, TM, CS, SH, LO, DS, IS, US, etc.)
  name: string;
  value: string;
}

export interface DicomInstance {
  instanceNumber: number;
  sopInstanceUid: string;
  rows: number;
  columns: number;
  pixelSpacing: [number, number]; // [rowSpacing, colSpacing] in mm
  sliceThickness?: number;
  sliceLocation?: number;
  windowWidth: number;
  windowCenter: number;
  rescaleSlope: number;
  rescaleIntercept: number;
  photometricInterpretation: string;
  pixelData: Float32Array; // Raw or calibrated pixel intensities
  tags: DicomTag[];
}

export interface DicomSeries {
  seriesInstanceUid: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: ModalityType;
  numberOfInstances: number;
  bodyPartExamined?: string;
  instances: DicomInstance[];
  thumbnailUrl?: string;
}

export interface DicomStudy {
  studyInstanceUid: string;
  patientId: string;
  patientName: string;
  patientBirthDate?: string;
  patientSex: 'M' | 'F' | 'O';
  patientAge: string;
  accessionNumber: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  referringPhysician: string;
  institutionName: string;
  modalitiesInStudy: ModalityType[];
  numberOfSeries: number;
  numberOfInstances: number;
  status: 'Unreported' | 'In Progress' | 'Completed' | 'Verified';
  criticalFinding?: boolean;
  series: DicomSeries[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface MeasurementBase {
  id: string;
  type: ToolType;
  instanceUid: string;
  color?: string;
  label?: string;
}

export interface DistanceMeasurement extends MeasurementBase {
  type: 'distance';
  start: Point2D;
  end: Point2D;
  lengthMm: number;
}

export interface MultiSegmentMeasurement extends MeasurementBase {
  type: 'multisegment';
  points: Point2D[];
  totalLengthMm: number;
}

export interface AngleMeasurement extends MeasurementBase {
  type: 'angle';
  p1: Point2D;
  vertex: Point2D;
  p2: Point2D;
  angleDegrees: number;
}

export interface CobbAngleMeasurement extends MeasurementBase {
  type: 'cobbAngle';
  line1Start: Point2D;
  line1End: Point2D;
  line2Start: Point2D;
  line2End: Point2D;
  cobbAngleDegrees: number;
}

export interface RoiStatistics {
  areaMm2: number;
  meanHU: number;
  minHU: number;
  maxHU: number;
  stdDevHU: number;
}

export interface RectRoiMeasurement extends MeasurementBase {
  type: 'rectangleRoi';
  topLeft: Point2D;
  bottomRight: Point2D;
  stats: RoiStatistics;
}

export interface EllipseRoiMeasurement extends MeasurementBase {
  type: 'ellipseRoi';
  center: Point2D;
  radiusX: number;
  radiusY: number;
  stats: RoiStatistics;
}

export interface PointProbeMeasurement extends MeasurementBase {
  type: 'pointProbe';
  point: Point2D;
  huValue: number;
  rawValue: number;
}

export interface FreehandMeasurement extends MeasurementBase {
  type: 'freehand';
  points: Point2D[];
  stats: RoiStatistics;
}

export interface AnnotationText extends MeasurementBase {
  type: 'text';
  point: Point2D;
  text: string;
}

export interface AnnotationArrow extends MeasurementBase {
  type: 'arrow';
  start: Point2D;
  end: Point2D;
  text?: string;
}

export type Measurement = 
  | DistanceMeasurement 
  | MultiSegmentMeasurement 
  | AngleMeasurement 
  | CobbAngleMeasurement 
  | RectRoiMeasurement 
  | EllipseRoiMeasurement 
  | PointProbeMeasurement 
  | FreehandMeasurement 
  | AnnotationText 
  | AnnotationArrow;

export interface ViewportState {
  id: string;
  studyUid: string;
  seriesUid: string;
  currentSliceIndex: number;
  zoom: number;
  pan: Point2D;
  rotation: number; // degrees (0, 90, 180, 270)
  flipH: boolean;
  flipV: boolean;
  invert: boolean;
  windowWidth: number;
  windowCenter: number;
  activeTool: ToolType;
  isCinePlaying: boolean;
  cineFps: number;
}

export interface PacsServerConfig {
  id: string;
  name: string;
  manufacturer: 'Orthanc' | 'dcm4chee' | 'Conquest' | 'GE Healthcare' | 'Philips' | 'Siemens' | 'Sectra' | 'Generic DICOMweb';
  aeTitle: string;
  ipAddress: string;
  port: number;
  localAeTitle: string;
  dicomWebUrl: string;
  authType: 'None' | 'Basic' | 'Bearer' | 'API Key';
  username?: string;
  password?: string;
  tlsEnabled: boolean;
  connectionTimeoutSec: number;
  isDefault: boolean;
  status: 'Connected' | 'Disconnected' | 'Error';
  lastPingMs?: number;
  lastChecked?: string;
}

export interface RadiologyReport {
  id: string;
  studyUid: string;
  patientId: string;
  patientName: string;
  modality: ModalityType;
  status: 'Draft' | 'Pending Verification' | 'Verified';
  author: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  clinicalHistory: string;
  technique: string;
  comparison: string;
  findings: string;
  impression: string;
  recommendations: string;
  criticalFinding: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  role: UserRole;
  action: 'LOGIN' | 'OPEN_STUDY' | 'EXPORT_IMAGE' | 'EXPORT_REPORT' | 'SAVE_MEASUREMENT' | 'PACS_TEST' | 'CHANGE_PRESET';
  patientId?: string;
  studyUid?: string;
  details: string;
  ipAddress: string;
}
