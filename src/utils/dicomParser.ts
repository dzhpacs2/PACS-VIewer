import { DicomInstance, DicomTag } from '../types/dicom';

/**
 * DICOM Tag dictionary for human-readable tag names and common descriptions
 */
export const DICOM_DICTIONARY: Record<string, { name: string; vr: string }> = {
  '00080005': { name: 'Specific Character Set', vr: 'CS' },
  '00080008': { name: 'Image Type', vr: 'CS' },
  '00080016': { name: 'SOP Class UID', vr: 'UI' },
  '00080018': { name: 'SOP Instance UID', vr: 'UI' },
  '00080020': { name: 'Study Date', vr: 'DA' },
  '00080030': { name: 'Study Time', vr: 'TM' },
  '00080050': { name: 'Accession Number', vr: 'SH' },
  '00080060': { name: 'Modality', vr: 'CS' },
  '00080070': { name: 'Manufacturer', vr: 'LO' },
  '00080080': { name: 'Institution Name', vr: 'LO' },
  '00080090': { name: 'Referring Physician Name', vr: 'PN' },
  '00081030': { name: 'Study Description', vr: 'LO' },
  '0008103E': { name: 'Series Description', vr: 'LO' },
  '00100010': { name: 'Patient Name', vr: 'PN' },
  '00100020': { name: 'Patient ID', vr: 'LO' },
  '00100030': { name: 'Patient Birth Date', vr: 'DA' },
  '00100040': { name: 'Patient Sex', vr: 'CS' },
  '00101010': { name: 'Patient Age', vr: 'AS' },
  '00180015': { name: 'Body Part Examined', vr: 'CS' },
  '00180050': { name: 'Slice Thickness', vr: 'DS' },
  '00180060': { name: 'KVP', vr: 'DS' },
  '00181150': { name: 'Exposure Time', vr: 'IS' },
  '0020000D': { name: 'Study Instance UID', vr: 'UI' },
  '0020000E': { name: 'Series Instance UID', vr: 'UI' },
  '00200010': { name: 'Study ID', vr: 'SH' },
  '00200011': { name: 'Series Number', vr: 'IS' },
  '00200013': { name: 'Instance Number', vr: 'IS' },
  '00200032': { name: 'Image Position (Patient)', vr: 'DS' },
  '00200037': { name: 'Image Orientation (Patient)', vr: 'DS' },
  '00201041': { name: 'Slice Location', vr: 'DS' },
  '00280002': { name: 'Samples per Pixel', vr: 'US' },
  '00280004': { name: 'Photometric Interpretation', vr: 'CS' },
  '00280010': { name: 'Rows', vr: 'US' },
  '00280011': { name: 'Columns', vr: 'US' },
  '00280030': { name: 'Pixel Spacing', vr: 'DS' },
  '00280100': { name: 'Bits Allocated', vr: 'US' },
  '00280101': { name: 'Bits Stored', vr: 'US' },
  '00280102': { name: 'High Bit', vr: 'US' },
  '00280103': { name: 'Pixel Representation', vr: 'US' },
  '00281050': { name: 'Window Center', vr: 'DS' },
  '00281051': { name: 'Window Width', vr: 'DS' },
  '00281052': { name: 'Rescale Intercept', vr: 'DS' },
  '00281053': { name: 'Rescale Slope', vr: 'DS' },
  '7FE00010': { name: 'Pixel Data', vr: 'OW' },
};

export interface ParsedDicomData {
  instance: DicomInstance;
  studyInstanceUid: string;
  seriesInstanceUid: string;
  patientId: string;
  patientName: string;
  modality: string;
  studyDescription: string;
  seriesDescription: string;
  studyDate: string;
  accessionNumber: string;
}

/**
 * Lightweight DICOM P10 parser supporting Explicit and Implicit VR Little Endian
 */
export function parseDicomP10(buffer: ArrayBuffer): ParsedDicomData {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Check DICM prefix at offset 128
  let isDicomP10 = false;
  if (buffer.byteLength > 132) {
    const magic = String.fromCharCode(bytes[128], bytes[129], bytes[130], bytes[131]);
    if (magic === 'DICM') {
      isDicomP10 = true;
    }
  }

  let offset = isDicomP10 ? 132 : 0;
  const tags: DicomTag[] = [];
  const tagMap: Record<string, string> = {};
  let rawPixelOffset = -1;
  let rawPixelLength = 0;

  let rows = 512;
  let cols = 512;
  let bitsAllocated = 16;
  let pixelRepresentation = 0; // 0 = unsigned, 1 = signed
  let windowCenter = 40;
  let windowWidth = 400;
  let rescaleSlope = 1;
  let rescaleIntercept = 0;
  let pixelSpacing: [number, number] = [1, 1];
  let photometric = 'MONOCHROME2';

  const textDecoder = new TextDecoder('latin1');

  while (offset + 8 <= buffer.byteLength) {
    const group = view.getUint16(offset, true);
    const element = view.getUint16(offset + 2, true);
    const groupHex = group.toString(16).padStart(4, '0').toUpperCase();
    const elemHex = element.toString(16).padStart(4, '0').toUpperCase();
    const tagKey = groupHex + elemHex;

    offset += 4;

    // Check VR
    let vr = '';
    let length = 0;

    const b0 = bytes[offset];
    const b1 = bytes[offset + 1];
    const isExplicitVR =
      b0 >= 65 && b0 <= 90 && b1 >= 65 && b1 <= 90; // two uppercase ASCII chars

    if (isExplicitVR) {
      vr = String.fromCharCode(b0, b1);
      offset += 2;

      // 4-byte length VRs
      if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
        offset += 2; // skip reserved 2 bytes
        length = view.getUint32(offset, true);
        offset += 4;
      } else {
        length = view.getUint16(offset, true);
        offset += 2;
      }
    } else {
      // Implicit VR Little Endian
      vr = DICOM_DICTIONARY[tagKey]?.vr || 'UN';
      length = view.getUint32(offset, true);
      offset += 4;
    }

    if (tagKey === '7FE00010') {
      // Pixel Data tag
      rawPixelOffset = offset;
      rawPixelLength = length;
      tags.push({
        tag: `(${groupHex},${elemHex})`,
        group: groupHex,
        element: elemHex,
        vr: 'OW/OB',
        name: 'Pixel Data',
        value: `${length} bytes encapsulated/raw pixel array`,
      });
      break;
    }

    // Read value if reasonable length
    let strVal = '';
    if (length > 0 && length < 4096 && offset + length <= buffer.byteLength) {
      const valBytes = bytes.subarray(offset, offset + length);
      strVal = textDecoder.decode(valBytes).replace(/\0+$/, '').trim();
    } else if (length === 2 && offset + 2 <= buffer.byteLength) {
      strVal = view.getUint16(offset, true).toString();
    } else if (length === 4 && offset + 4 <= buffer.byteLength) {
      strVal = view.getUint32(offset, true).toString();
    }

    const dictEntry = DICOM_DICTIONARY[tagKey];
    const tagName = dictEntry?.name || `Unknown (${groupHex},${elemHex})`;

    tags.push({
      tag: `(${groupHex},${elemHex})`,
      group: groupHex,
      element: elemHex,
      vr,
      name: tagName,
      value: strVal || (length > 0 ? `[${length} bytes]` : ''),
    });

    tagMap[tagKey] = strVal;

    // Parse known imaging values
    if (tagKey === '00280010' && strVal) rows = parseInt(strVal, 10) || rows;
    if (tagKey === '00280011' && strVal) cols = parseInt(strVal, 10) || cols;
    if (tagKey === '00280100' && strVal) bitsAllocated = parseInt(strVal, 10) || bitsAllocated;
    if (tagKey === '00280103' && strVal) pixelRepresentation = parseInt(strVal, 10) || 0;
    if (tagKey === '00281050' && strVal) {
      const parts = strVal.split('\\');
      windowCenter = parseFloat(parts[0]) || windowCenter;
    }
    if (tagKey === '00281051' && strVal) {
      const parts = strVal.split('\\');
      windowWidth = parseFloat(parts[0]) || windowWidth;
    }
    if (tagKey === '00281052' && strVal) rescaleIntercept = parseFloat(strVal) || rescaleIntercept;
    if (tagKey === '00281053' && strVal) rescaleSlope = parseFloat(strVal) || rescaleSlope;
    if (tagKey === '00280004' && strVal) photometric = strVal;
    if (tagKey === '00280030' && strVal) {
      const parts = strVal.split('\\');
      if (parts.length >= 2) {
        pixelSpacing = [parseFloat(parts[0]) || 1, parseFloat(parts[1]) || 1];
      }
    }

    offset += length;
    // Align to 2-byte boundary if needed
    if (length % 2 !== 0 && offset < buffer.byteLength) {
      offset += 1;
    }
  }

  // Extract pixel array
  const totalPixels = rows * cols;
  const pixelData = new Float32Array(totalPixels);

  if (rawPixelOffset > 0 && rawPixelOffset < buffer.byteLength) {
    if (bitsAllocated === 16) {
      if (pixelRepresentation === 1) {
        const int16View = new Int16Array(buffer, rawPixelOffset, Math.min(totalPixels, Math.floor(rawPixelLength / 2)));
        for (let i = 0; i < int16View.length; i++) pixelData[i] = int16View[i];
      } else {
        const uint16View = new Uint16Array(buffer, rawPixelOffset, Math.min(totalPixels, Math.floor(rawPixelLength / 2)));
        for (let i = 0; i < uint16View.length; i++) pixelData[i] = uint16View[i];
      }
    } else {
      const uint8View = new Uint8Array(buffer, rawPixelOffset, Math.min(totalPixels, rawPixelLength));
      for (let i = 0; i < uint8View.length; i++) pixelData[i] = uint8View[i];
    }
  }

  const instance: DicomInstance = {
    instanceNumber: parseInt(tagMap['00200013'] || '1', 10),
    sopInstanceUid: tagMap['00080018'] || `1.2.840.10008.5.1.4.1.1.${Date.now()}`,
    rows,
    columns: cols,
    pixelSpacing,
    sliceThickness: parseFloat(tagMap['00180050'] || '1.0'),
    sliceLocation: parseFloat(tagMap['00201041'] || '0.0'),
    windowWidth,
    windowCenter,
    rescaleSlope,
    rescaleIntercept,
    photometricInterpretation: photometric,
    pixelData,
    tags,
  };

  return {
    instance,
    studyInstanceUid: tagMap['0020000D'] || `1.2.826.0.1.3680043.${Date.now()}`,
    seriesInstanceUid: tagMap['0020000E'] || `1.2.826.0.1.3680043.${Date.now()}.1`,
    patientId: tagMap['00100020'] || 'ANON-PATIENT',
    patientName: tagMap['00100010'] || 'Anonymous Patient',
    modality: tagMap['00080060'] || 'CT',
    studyDescription: tagMap['00081030'] || 'Uploaded DICOM Study',
    seriesDescription: tagMap['0008103E'] || 'Series 1',
    studyDate: tagMap['00080020'] || new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    accessionNumber: tagMap['00080050'] || `ACC-${Date.now().toString().slice(-6)}`,
  };
}
