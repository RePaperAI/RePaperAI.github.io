import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePixels } from '../scanner.js';

function sheet(width = 100, height = 140) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([255, 255, 255, 255], i);
  return { data, width, height };
}
function pixel(image, x, y, value = 30) {
  image.data.set([value, value, value, 255], (y * image.width + x) * 4);
}
function line(image, x1, y1, x2, y2, value = 30) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let n = 0; n <= steps; n++) {
    const x = Math.round(x1 + (x2 - x1) * n / steps), y = Math.round(y1 + (y2 - y1) * n / steps);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (x + dx >= 0 && x + dx < image.width && y + dy >= 0 && y + dy < image.height) pixel(image, x + dx, y + dy, value);
    }
  }
}

test('blank document has nearly all usable blank area', () => {
  const result = analyzePixels(sheet());
  assert.equal(result.type, 'blank');
  assert.ok(result.blank > 98);
  assert.equal(result.damage, 0);
});

test('printed document is detected from regular text-like rows', () => {
  const image = sheet();
  for (const y of [25, 40, 55, 70, 85, 100]) for (let x = 15; x < 85; x += 2) line(image, x, y, Math.min(x + 7, 85), y);
  const result = analyzePixels(image);
  assert.equal(result.type, 'printed');
  assert.ok(result.printed > 5);
});

test('handwritten document is detected from irregular strokes', () => {
  const image = sheet();
  for (let y = 28; y < 105; y += 14) {
    line(image, 15, y + 4, 25, y - 5); line(image, 25, y - 5, 35, y + 5);
    line(image, 35, y + 5, 48, y - 4); line(image, 48, y - 4, 59, y + 6); line(image, 59, y + 6, 73, y - 6);
  }
  const result = analyzePixels(image);
  assert.equal(result.type, 'handwritten');
  assert.ok(result.printed > 5);
});

test('document with a damaged edge reports damage and damaged type', () => {
  const image = sheet();
  for (let y = 0; y < image.height; y++) for (let x = 0; x < 12; x++) pixel(image, x, y, 20);
  const result = analyzePixels(image);
  assert.equal(result.type, 'damaged');
  assert.ok(result.damage > 20);
});
