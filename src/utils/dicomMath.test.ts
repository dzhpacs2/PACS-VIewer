import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rawToHounsfield,
  hounsfieldToPixel8Bit,
  calculateDistanceMm,
  calculateAngleDegrees,
  calculateCobbAngle,
  calculateRoiStatistics,
} from './dicomMath';

test('rawToHounsfield calculates correct HU with slope and intercept', () => {
  // Typical CT with slope = 1, intercept = -1024
  assert.equal(rawToHounsfield(1024, 1, -1024), 0); // Water = 0 HU
  assert.equal(rawToHounsfield(0, 1, -1024), -1024); // Air = -1024 HU
  assert.equal(rawToHounsfield(2024, 1, -1024), 1000); // Dense bone = 1000 HU
});

test('hounsfieldToPixel8Bit maps values accurately inside and outside window', () => {
  // Window Width = 400, Window Center = 50
  // Range is roughly -150 to 250
  const w = 400;
  const c = 50;

  // Below lower threshold should clamp to 0
  assert.equal(hounsfieldToPixel8Bit(-200, w, c, false), 0);

  // Above upper threshold should clamp to 255
  assert.equal(hounsfieldToPixel8Bit(300, w, c, false), 255);

  // Center should be roughly 128 (mid-gray)
  const centerVal = hounsfieldToPixel8Bit(50, w, c, false);
  assert.ok(centerVal >= 126 && centerVal <= 130, `Expected ~128, got ${centerVal}`);

  // Inverted mode: below lower threshold becomes 255, above becomes 0
  assert.equal(hounsfieldToPixel8Bit(-200, w, c, true), 255);
  assert.equal(hounsfieldToPixel8Bit(300, w, c, true), 0);
});

test('calculateDistanceMm calculates Euclidean distance with pixel spacing', () => {
  // 30 pixels horizontal at 0.5mm/pixel -> 15mm
  const p1 = { x: 10, y: 10 };
  const p2 = { x: 40, y: 10 };
  const dist = calculateDistanceMm(p1, p2, [0.5, 0.5]);
  assert.equal(dist, 15);

  // Non-square pixel spacing (row=0.8, col=0.4)
  // dx = (50 - 10) * 0.4 = 16
  // dy = (40 - 10) * 0.8 = 24
  // sqrt(16^2 + 24^2) = sqrt(256 + 576) = sqrt(832) ~ 28.84
  const distNonSquare = calculateDistanceMm({ x: 10, y: 10 }, { x: 50, y: 40 }, [0.8, 0.4]);
  assert.equal(distNonSquare, 28.84);
});

test('calculateAngleDegrees returns accurate 90 and 45 degree angles', () => {
  const vertex = { x: 0, y: 0 };
  const p1 = { x: 10, y: 0 };
  const p2 = { x: 0, y: 10 };

  const angle90 = calculateAngleDegrees(p1, vertex, p2);
  assert.equal(angle90, 90);

  const p3 = { x: 10, y: 10 };
  const angle45 = calculateAngleDegrees(p1, vertex, p3);
  assert.equal(angle45, 45);
});

test('calculateCobbAngle measures intersection angle between vertebral lines', () => {
  // Line 1: horizontal (slope = 0)
  const line1Start = { x: 0, y: 0 };
  const line1End = { x: 100, y: 0 };

  // Line 2: tilted at 30 degrees
  const angleRad = (30 * Math.PI) / 180;
  const line2Start = { x: 0, y: 50 };
  const line2End = { x: 100 * Math.cos(angleRad), y: 50 + 100 * Math.sin(angleRad) };

  const cobb = calculateCobbAngle(line1Start, line1End, line2Start, line2End);
  assert.equal(cobb, 30);
});

test('calculateRoiStatistics computes accurate Area, Mean, Min, Max, and StdDev', () => {
  // 4 raw pixels: [1000, 1020, 1040, 1020]
  // With slope=1, intercept=-1000 -> HU values: [0, 20, 40, 20]
  // Mean = 20, Min = 0, Max = 40
  // Variance = ((0-20)^2 + (20-20)^2 + (40-20)^2 + (20-20)^2) / 4 = (400 + 0 + 400 + 0) / 4 = 200
  // StdDev = sqrt(200) ~ 14.14 -> 14.1
  // Area with pixel spacing [0.5, 0.5]: 4 * 0.25 = 1 mm²
  const rawPixels = [1000, 1020, 1040, 1020];
  const stats = calculateRoiStatistics(rawPixels, 1, -1000, [0.5, 0.5]);

  assert.equal(stats.areaMm2, 1);
  assert.equal(stats.meanHU, 20);
  assert.equal(stats.minHU, 0);
  assert.equal(stats.maxHU, 40);
  assert.equal(stats.stdDevHU, 14.1);
});
