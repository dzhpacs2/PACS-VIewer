import { DicomStudy, DicomSeries, DicomInstance, DicomTag } from '../types/dicom';

/**
 * Creates DICOM standard tags for an instance
 */
function createTags(params: {
  patientName: string;
  patientId: string;
  birthDate: string;
  sex: string;
  studyDate: string;
  accession: string;
  modality: string;
  studyDesc: string;
  seriesDesc: string;
  studyUid: string;
  seriesUid: string;
  instanceNum: number;
  rows: number;
  cols: number;
  pixelSpacing: [number, number];
  windowCenter: number;
  windowWidth: number;
  rescaleIntercept: number;
  rescaleSlope: number;
}): DicomTag[] {
  return [
    { tag: '(0008,0020)', group: '0008', element: '0020', vr: 'DA', name: 'Study Date', value: params.studyDate },
    { tag: '(0008,0030)', group: '0008', element: '0030', vr: 'TM', name: 'Study Time', value: '101530.00' },
    { tag: '(0008,0050)', group: '0008', element: '0050', vr: 'SH', name: 'Accession Number', value: params.accession },
    { tag: '(0008,0060)', group: '0008', element: '0060', vr: 'CS', name: 'Modality', value: params.modality },
    { tag: '(0008,0070)', group: '0008', element: '0070', vr: 'LO', name: 'Manufacturer', value: 'Apex Medical Imaging Systems' },
    { tag: '(0008,0080)', group: '0008', element: '0080', vr: 'LO', name: 'Institution Name', value: 'Metropolitan University Medical Center' },
    { tag: '(0008,0090)', group: '0008', element: '0090', vr: 'PN', name: 'Referring Physician', value: 'Dr. Sarah Sterling, MD' },
    { tag: '(0008,1030)', group: '0008', element: '1030', vr: 'LO', name: 'Study Description', value: params.studyDesc },
    { tag: '(0008,103E)', group: '0008', element: '103E', vr: 'LO', name: 'Series Description', value: params.seriesDesc },
    { tag: '(0010,0010)', group: '0010', element: '0010', vr: 'PN', name: "Patient's Name", value: params.patientName },
    { tag: '(0010,0020)', group: '0010', element: '0020', vr: 'LO', name: 'Patient ID', value: params.patientId },
    { tag: '(0010,0030)', group: '0010', element: '0030', vr: 'DA', name: "Patient's Birth Date", value: params.birthDate },
    { tag: '(0010,0040)', group: '0010', element: '0040', vr: 'CS', name: "Patient's Sex", value: params.sex },
    { tag: '(0020,000D)', group: '0020', element: '000D', vr: 'UI', name: 'Study Instance UID', value: params.studyUid },
    { tag: '(0020,000E)', group: '0020', element: '000E', vr: 'UI', name: 'Series Instance UID', value: params.seriesUid },
    { tag: '(0020,0013)', group: '0020', element: '0013', vr: 'IS', name: 'Instance Number', value: params.instanceNum.toString() },
    { tag: '(0028,0004)', group: '0028', element: '0004', vr: 'CS', name: 'Photometric Interpretation', value: 'MONOCHROME2' },
    { tag: '(0028,0010)', group: '0028', element: '0010', vr: 'US', name: 'Rows', value: params.rows.toString() },
    { tag: '(0028,0011)', group: '0028', element: '0011', vr: 'US', name: 'Columns', value: params.cols.toString() },
    { tag: '(0028,0030)', group: '0028', element: '0030', vr: 'DS', name: 'Pixel Spacing', value: `${params.pixelSpacing[0]}\\${params.pixelSpacing[1]}` },
    { tag: '(0028,0100)', group: '0028', element: '0100', vr: 'US', name: 'Bits Allocated', value: '16' },
    { tag: '(0028,0101)', group: '0028', element: '0101', vr: 'US', name: 'Bits Stored', value: '12' },
    { tag: '(0028,0102)', group: '0028', element: '0102', vr: 'US', name: 'High Bit', value: '11' },
    { tag: '(0028,0103)', group: '0028', element: '0103', vr: 'US', name: 'Pixel Representation', value: '0' },
    { tag: '(0028,1050)', group: '0028', element: '1050', vr: 'DS', name: 'Window Center', value: params.windowCenter.toString() },
    { tag: '(0028,1051)', group: '0028', element: '1051', vr: 'DS', name: 'Window Width', value: params.windowWidth.toString() },
    { tag: '(0028,1052)', group: '0028', element: '1052', vr: 'DS', name: 'Rescale Intercept', value: params.rescaleIntercept.toString() },
    { tag: '(0028,1053)', group: '0028', element: '1053', vr: 'DS', name: 'Rescale Slope', value: params.rescaleSlope.toString() },
  ];
}

/**
 * Generates an accurate 3D Head CT volume (24 slices, 128x128 grid)
 * with authentic CT attenuation values (HU calibrated):
 * - Background air: -1000 HU
 * - Scalp/skin: 30 HU
 * - Cranial bone skull: 900 - 1200 HU
 * - Brain parenchyma (cerebrum/cerebellum): 32 - 42 HU
 * - Lateral ventricles (CSF): 4 - 12 HU
 * - Acute subdural hematoma on left convexity in slices 10-14: 75 HU
 */
function generateHeadCtVolume(): DicomInstance[] {
  const slices = 24;
  const rows = 128;
  const cols = 128;
  const pixelSpacing: [number, number] = [0.85, 0.85];
  const sliceThickness = 2.5;

  const instances: DicomInstance[] = [];

  for (let s = 0; s < slices; s++) {
    const pixels = new Float32Array(rows * cols);
    const zRel = (s - slices / 2) / (slices / 2); // -1.0 to 1.0 (bottom to top of head)

    // Radius of head varies from base of skull to vertex
    const headRadiusX = Math.sqrt(Math.max(0, 1 - zRel * zRel * 0.75)) * 48;
    const headRadiusY = Math.sqrt(Math.max(0, 1 - zRel * zRel * 0.75)) * 54;

    const centerX = cols / 2;
    const centerY = rows / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const dx = c - centerX;
        const dy = r - centerY;

        // Normalized radial distance from center of head
        const distNorm = Math.sqrt((dx * dx) / (headRadiusX * headRadiusX) + (dy * dy) / (headRadiusY * headRadiusY));

        let hu = -1000; // Air outside

        if (distNorm <= 1.05 && distNorm > 0.98) {
          // Scalp / skin
          hu = 35 + Math.sin(dx * 0.3) * 5;
        } else if (distNorm <= 0.98 && distNorm > 0.86) {
          // Cranium cortical bone
          hu = 950 + Math.sin(c * 0.2 + r * 0.2) * 150;
        } else if (distNorm <= 0.86 && distNorm > 0.82) {
          // Diploe (cancellous bone inside skull)
          hu = 450 + Math.cos(c * 0.3) * 60;
        } else if (distNorm <= 0.82) {
          // Brain tissue
          hu = 36 + Math.sin(dx * 0.15) * 4 + Math.cos(dy * 0.15) * 3;

          // Ventricular system (CSF ~ 8 HU)
          const ventDistLeft = Math.sqrt(Math.pow(dx - 8, 2) + Math.pow(dy + 2, 2) * 0.4);
          const ventDistRight = Math.sqrt(Math.pow(dx + 8, 2) + Math.pow(dy + 2, 2) * 0.4);
          if (s >= 8 && s <= 16 && (ventDistLeft < 6 || ventDistRight < 6)) {
            hu = 8;
          }

          // Falx cerebri / midline fissure
          if (Math.abs(dx) < 1.2) {
            hu = 55; // dura / falx
          }

          // Clinical pathology: Hyperdense acute subdural collection (75 HU) along right frontoparietal convex
          if (s >= 10 && s <= 15 && dx < -26 && dx > -37 && dy < 15 && dy > -25) {
            hu = 78 + Math.random() * 6; // acute blood
          }
        }

        // Rescale: stored raw = HU - RescaleIntercept (-1024)
        // raw = hu + 1024
        pixels[idx] = Math.max(0, hu + 1024);
      }
    }

    instances.push({
      instanceNumber: s + 1,
      sopInstanceUid: `1.2.840.10008.5.1.4.1.1.2.9041.${s + 1}`,
      rows,
      columns: cols,
      pixelSpacing,
      sliceThickness,
      sliceLocation: (s - slices / 2) * sliceThickness,
      windowWidth: 80,
      windowCenter: 40,
      rescaleSlope: 1,
      rescaleIntercept: -1024,
      photometricInterpretation: 'MONOCHROME2',
      pixelData: pixels,
      tags: createTags({
        patientName: 'ALEXANDER^ROBERT^M',
        patientId: 'MRN-2026-9041',
        birthDate: '19740518',
        sex: 'M',
        studyDate: '20261108',
        accession: 'ACC-889104',
        modality: 'CT',
        studyDesc: 'CT HEAD W/O CONTRAST (TRAUMA PROTOCOL)',
        seriesDesc: 'Axial 2.5mm Standard Brain',
        studyUid: '1.2.840.10008.5.1.4.1.1.2.9041',
        seriesUid: '1.2.840.10008.5.1.4.1.1.2.9041.1',
        instanceNum: s + 1,
        rows,
        cols,
        pixelSpacing,
        windowCenter: 40,
        windowWidth: 80,
        rescaleIntercept: -1024,
        rescaleSlope: 1,
      }),
    });
  }

  return instances;
}

/**
 * Generates high-resolution Chest Radiography (PA and Lateral views)
 */
function generateChestXRay(): DicomSeries[] {
  const rows = 256;
  const cols = 256;
  const pixelSpacing: [number, number] = [0.35, 0.35];

  // PA View
  const paPixels = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const dx = (c - cols / 2) / (cols / 2);
      const dy = (r - rows / 2) / (rows / 2);

      let val = 200; // soft tissue background

      // Thoracic cage outline
      const thorax = Math.sqrt(dx * dx * 1.2 + (dy - 0.1) * (dy - 0.1));
      if (thorax < 0.85) {
        // Lung fields (radiolucent = darker)
        const leftLung = Math.sqrt(Math.pow(dx - 0.38, 2) * 1.3 + Math.pow(dy + 0.05, 2) * 0.9);
        const rightLung = Math.sqrt(Math.pow(dx + 0.38, 2) * 1.3 + Math.pow(dy + 0.05, 2) * 0.9);

        if (leftLung < 0.36 || rightLung < 0.36) {
          val = 1400 + Math.sin(r * 0.15) * 80; // Radiolucent lung markings
          // Pulmonary vascular bronchovascular markings
          val += Math.sin((dx + dy) * 20) * 120;
        }

        // Rib shadows (curved radiopaque bands)
        const ribBand = Math.sin(dy * 16 + Math.abs(dx) * 4);
        if (ribBand > 0.4) {
          val -= 350;
        }

        // Clavicles
        if (r > 45 && r < 60 && Math.abs(dx) > 0.15 && Math.abs(dx) < 0.75) {
          val -= 450;
        }

        // Mediastinum & Cardiac silhouette
        const heartDist = Math.sqrt(Math.pow(dx - 0.12, 2) * 2.2 + Math.pow(dy - 0.18, 2) * 1.5);
        if (heartDist < 0.34 || Math.abs(dx) < 0.16) {
          val = 400 + Math.sin(r * 0.1) * 30; // Radiopaque soft tissue
        }

        // Diaphragmatic domes
        if (dy > 0.38) {
          val = 280; // subdiaphragmatic liver/gastric bubble
        }
      }

      paPixels[idx] = Math.max(50, Math.min(4000, val));
    }
  }

  const paInstance: DicomInstance = {
    instanceNumber: 1,
    sopInstanceUid: '1.2.840.10008.5.1.4.1.1.1.8812.1',
    rows,
    columns: cols,
    pixelSpacing,
    windowWidth: 2048,
    windowCenter: 1024,
    rescaleSlope: 1,
    rescaleIntercept: 0,
    photometricInterpretation: 'MONOCHROME2',
    pixelData: paPixels,
    tags: createTags({
      patientName: 'CHEN^MEI-LING',
      patientId: 'MRN-2026-8812',
      birthDate: '19880922',
      sex: 'F',
      studyDate: '20261109',
      accession: 'ACC-774019',
      modality: 'DX',
      studyDesc: 'CHEST 2-VIEW POSTEROANTERIOR & LATERAL',
      seriesDesc: 'PA Chest Upright',
      studyUid: '1.2.840.10008.5.1.4.1.1.1.8812',
      seriesUid: '1.2.840.10008.5.1.4.1.1.1.8812.1',
      instanceNum: 1,
      rows,
      cols,
      pixelSpacing,
      windowCenter: 1024,
      windowWidth: 2048,
      rescaleIntercept: 0,
      rescaleSlope: 1,
    }),
  };

  return [
    {
      seriesInstanceUid: '1.2.840.10008.5.1.4.1.1.1.8812.1',
      seriesNumber: 1,
      seriesDescription: 'Chest PA Projection',
      modality: 'DX',
      numberOfInstances: 1,
      bodyPartExamined: 'CHEST',
      instances: [paInstance],
    },
  ];
}

/**
 * Generates multi-sequence Brain MRI (T1, T2, FLAIR)
 */
function generateBrainMri(): DicomSeries[] {
  const rows = 128;
  const cols = 128;
  const pixelSpacing: [number, number] = [0.9, 0.9];

  const seriesList: { name: string; desc: string; num: number; csfVal: number; brainVal: number; whiteMatter: number }[] = [
    { name: 'T1_AXIAL', desc: 'Axial T1 Spin Echo', num: 1, csfVal: 60, brainVal: 380, whiteMatter: 520 },
    { name: 'T2_AXIAL', desc: 'Axial T2 Fast Spin Echo', num: 2, csfVal: 950, brainVal: 480, whiteMatter: 320 },
    { name: 'FLAIR_AXIAL', desc: 'Axial T2 FLAIR (Fluid Attenuated)', num: 3, csfVal: 80, brainVal: 460, whiteMatter: 350 },
  ];

  return seriesList.map((seq) => {
    const instances: DicomInstance[] = [];
    const numSlices = 8;

    for (let s = 0; s < numSlices; s++) {
      const pixels = new Float32Array(rows * cols);
      const z = (s - numSlices / 2) / (numSlices / 2);
      const brainRad = Math.sqrt(Math.max(0, 1 - z * z * 0.7)) * 46;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const dx = c - cols / 2;
          const dy = r - rows / 2;
          const dist = Math.sqrt(dx * dx + dy * dy * 1.15);

          let val = 20; // background air
          if (dist < brainRad) {
            // Cortex gray matter vs subcortical white matter
            if (dist > brainRad * 0.75) {
              val = seq.brainVal + Math.sin(dx * 0.4) * 20;
            } else {
              val = seq.whiteMatter + Math.cos(dy * 0.4) * 25;
            }

            // Ventricles
            const vent = Math.sqrt(Math.pow(Math.abs(dx) - 7, 2) + Math.pow(dy, 2) * 0.5);
            if (vent < 6.5) {
              val = seq.csfVal;
            }

            // In FLAIR, add a hyperintense MS plaque / small focal hyperintensity near left ventricle
            if (seq.name === 'FLAIR_AXIAL' && s >= 3 && s <= 5 && dx < -9 && dx > -16 && dy > -5 && dy < 3) {
              val = 820; // hyperintense lesion
            }
          }

          pixels[idx] = val;
        }
      }

      instances.push({
        instanceNumber: s + 1,
        sopInstanceUid: `1.2.840.10008.5.1.4.1.1.4.7734.${seq.num}.${s + 1}`,
        rows,
        columns: cols,
        pixelSpacing,
        sliceThickness: 4.0,
        sliceLocation: s * 4.0,
        windowWidth: 600,
        windowCenter: 300,
        rescaleSlope: 1,
        rescaleIntercept: 0,
        photometricInterpretation: 'MONOCHROME2',
        pixelData: pixels,
        tags: createTags({
          patientName: 'DAVIS^JONATHAN',
          patientId: 'MRN-2026-7734',
          birthDate: '19820314',
          sex: 'M',
          studyDate: '20261107',
          accession: 'ACC-661902',
          modality: 'MR',
          studyDesc: 'MRI BRAIN W/ & W/O CONTRAST',
          seriesDesc: seq.desc,
          studyUid: '1.2.840.10008.5.1.4.1.1.4.7734',
          seriesUid: `1.2.840.10008.5.1.4.1.1.4.7734.${seq.num}`,
          instanceNum: s + 1,
          rows,
          cols,
          pixelSpacing,
          windowCenter: 300,
          windowWidth: 600,
          rescaleIntercept: 0,
          rescaleSlope: 1,
        }),
      });
    }

    return {
      seriesInstanceUid: `1.2.840.10008.5.1.4.1.1.4.7734.${seq.num}`,
      seriesNumber: seq.num,
      seriesDescription: seq.desc,
      modality: 'MR',
      numberOfInstances: numSlices,
      bodyPartExamined: 'BRAIN',
      instances,
    };
  });
}

/**
 * Generates an Ultrasound Cine sequence (16 dynamic multiframe instances)
 */
function generateUltrasoundCine(): DicomSeries[] {
  const frames = 16;
  const rows = 128;
  const cols = 128;
  const pixelSpacing: [number, number] = [0.4, 0.4];

  const instances: DicomInstance[] = [];

  for (let f = 0; f < frames; f++) {
    const pixels = new Float32Array(rows * cols);
    const phase = (f / frames) * Math.PI * 2;
    const heartContraction = Math.sin(phase) * 6; // Chamber expands/contracts

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const dx = c - cols / 2;
        const dy = r - 20;

        // Sector probe cone geometry
        const angle = Math.atan2(dx, dy);
        const radius = Math.sqrt(dx * dx + dy * dy);

        let val = 15; // Acoustic shadow outside probe sector
        if (Math.abs(angle) < 0.65 && radius > 25 && radius < 110) {
          // Acoustic speckle background
          const speckle = (Math.sin(c * 1.8) * Math.cos(r * 1.5) + 1) * 35;
          val = 60 + speckle;

          // Left Ventricle cavity (anechoic black)
          const lvX = dx - 8;
          const lvY = dy - 55;
          const lvRad = 20 + heartContraction;
          const lvDist = Math.sqrt(lvX * lvX * 1.3 + lvY * lvY * 0.9);

          if (lvDist < lvRad) {
            val = 20 + Math.random() * 8; // Blood is anechoic
          } else if (lvDist < lvRad + 5) {
            // Myocardial wall (hyperechoic)
            val = 180 + Math.random() * 40;
          }

          // Mitral valve leaflets moving with phase
          const valveOffset = Math.sin(phase) * 10;
          if (Math.abs(dy - 50 - valveOffset) < 2.5 && Math.abs(dx - 8) < 14) {
            val = 230; // bright valve echogenicity
          }
        }

        pixels[idx] = val;
      }
    }

    instances.push({
      instanceNumber: f + 1,
      sopInstanceUid: `1.2.840.10008.5.1.4.1.1.6.6190.${f + 1}`,
      rows,
      columns: cols,
      pixelSpacing,
      windowWidth: 256,
      windowCenter: 128,
      rescaleSlope: 1,
      rescaleIntercept: 0,
      photometricInterpretation: 'MONOCHROME2',
      pixelData: pixels,
      tags: createTags({
        patientName: 'SANTOS^MARIA^E',
        patientId: 'MRN-2026-6190',
        birthDate: '19651204',
        sex: 'F',
        studyDate: '20261110',
        accession: 'ACC-552084',
        modality: 'US',
        studyDesc: 'ECHOCARDIOGRAM COMPLETE WITH DOPPLER',
        seriesDesc: 'Parasternal Long Axis Cine Loop',
        studyUid: '1.2.840.10008.5.1.4.1.1.6.6190',
        seriesUid: '1.2.840.10008.5.1.4.1.1.6.6190.1',
        instanceNum: f + 1,
        rows,
        cols,
        pixelSpacing,
        windowCenter: 128,
        windowWidth: 256,
        rescaleIntercept: 0,
        rescaleSlope: 1,
      }),
    });
  }

  return [
    {
      seriesInstanceUid: '1.2.840.10008.5.1.4.1.1.6.6190.1',
      seriesNumber: 1,
      seriesDescription: 'PLAX 2D Cine Loop',
      modality: 'US',
      numberOfInstances: frames,
      bodyPartExamined: 'HEART',
      instances,
    },
  ];
}

/**
 * Built-in clinical studies library
 */
export const SAMPLE_STUDIES: DicomStudy[] = [
  {
    studyInstanceUid: '1.2.840.10008.5.1.4.1.1.2.9041',
    patientId: 'MRN-2026-9041',
    patientName: 'ALEXANDER, ROBERT M.',
    patientBirthDate: '1974-05-18',
    patientSex: 'M',
    patientAge: '52Y',
    accessionNumber: 'ACC-889104',
    studyDate: '2026-11-08',
    studyTime: '10:15:30',
    studyDescription: 'CT HEAD W/O CONTRAST (TRAUMA PROTOCOL)',
    referringPhysician: 'Dr. Sarah Sterling, MD',
    institutionName: 'Metropolitan University Medical Center',
    modalitiesInStudy: ['CT'],
    numberOfSeries: 1,
    numberOfInstances: 24,
    status: 'In Progress',
    criticalFinding: true,
    series: [
      {
        seriesInstanceUid: '1.2.840.10008.5.1.4.1.1.2.9041.1',
        seriesNumber: 1,
        seriesDescription: 'Axial 2.5mm Standard Brain (3D Volume)',
        modality: 'CT',
        numberOfInstances: 24,
        bodyPartExamined: 'HEAD',
        instances: generateHeadCtVolume(),
      },
    ],
  },
  {
    studyInstanceUid: '1.2.840.10008.5.1.4.1.1.1.8812',
    patientId: 'MRN-2026-8812',
    patientName: 'CHEN, MEI-LING',
    patientBirthDate: '1988-09-22',
    patientSex: 'F',
    patientAge: '38Y',
    accessionNumber: 'ACC-774019',
    studyDate: '2026-11-09',
    studyTime: '14:22:10',
    studyDescription: 'CHEST 2-VIEW POSTEROANTERIOR & LATERAL',
    referringPhysician: 'Dr. Keith Vance, MD',
    institutionName: 'Metropolitan University Medical Center',
    modalitiesInStudy: ['DX'],
    numberOfSeries: 1,
    numberOfInstances: 1,
    status: 'Unreported',
    criticalFinding: false,
    series: generateChestXRay(),
  },
  {
    studyInstanceUid: '1.2.840.10008.5.1.4.1.1.4.7734',
    patientId: 'MRN-2026-7734',
    patientName: 'DAVIS, JONATHAN',
    patientBirthDate: '1982-03-14',
    patientSex: 'M',
    patientAge: '44Y',
    accessionNumber: 'ACC-661902',
    studyDate: '2026-11-07',
    studyTime: '08:45:00',
    studyDescription: 'MRI BRAIN MULTI-SEQUENCE W/ & W/O CONTRAST',
    referringPhysician: 'Dr. Angela Rossi, MD',
    institutionName: 'Neurological Institute of Imaging',
    modalitiesInStudy: ['MR'],
    numberOfSeries: 3,
    numberOfInstances: 24,
    status: 'Completed',
    criticalFinding: false,
    series: generateBrainMri(),
  },
  {
    studyInstanceUid: '1.2.840.10008.5.1.4.1.1.6.6190',
    patientId: 'MRN-2026-6190',
    patientName: 'SANTOS, MARIA E.',
    patientBirthDate: '1965-12-04',
    patientSex: 'F',
    patientAge: '60Y',
    accessionNumber: 'ACC-552084',
    studyDate: '2026-11-10',
    studyTime: '11:05:42',
    studyDescription: 'ECHOCARDIOGRAM COMPLETE CINE LOOP',
    referringPhysician: 'Dr. Marcus Thorne, MD',
    institutionName: 'Cardiovascular Care Center',
    modalitiesInStudy: ['US'],
    numberOfSeries: 1,
    numberOfInstances: 16,
    status: 'Verified',
    criticalFinding: false,
    series: generateUltrasoundCine(),
  },
];
