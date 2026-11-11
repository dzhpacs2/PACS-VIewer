import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_STUDIES } from './sampleStudies';

test('SAMPLE_STUDIES contains multiple clinically diverse modalities', () => {
  assert.equal(SAMPLE_STUDIES.length, 4);

  const headCt = SAMPLE_STUDIES.find((s) => s.modalitiesInStudy.includes('CT'));
  assert.ok(headCt, 'Head CT study should be present');
  assert.equal(headCt.series[0].instances.length, 24);

  // Check CT HU calibration tags
  const firstSlice = headCt.series[0].instances[0];
  assert.equal(firstSlice.rows, 128);
  assert.equal(firstSlice.columns, 128);
  assert.equal(firstSlice.rescaleSlope, 1);
  assert.equal(firstSlice.rescaleIntercept, -1024);
  assert.equal(firstSlice.pixelData.length, 128 * 128);

  const chestDx = SAMPLE_STUDIES.find((s) => s.modalitiesInStudy.includes('DX'));
  assert.ok(chestDx, 'Chest DX study should be present');

  const brainMr = SAMPLE_STUDIES.find((s) => s.modalitiesInStudy.includes('MR'));
  assert.ok(brainMr, 'Brain MRI study should be present');
  assert.equal(brainMr.series.length, 3); // T1, T2, FLAIR

  const cardiacUs = SAMPLE_STUDIES.find((s) => s.modalitiesInStudy.includes('US'));
  assert.ok(cardiacUs, 'Ultrasound Cine study should be present');
  assert.equal(cardiacUs.series[0].instances.length, 16); // 16 cine frames
});
