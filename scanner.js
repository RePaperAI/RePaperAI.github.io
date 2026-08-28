/* Deterministic, dependency-free image analysis for paper scans. */

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

/**
 * Analyze an ImageData-compatible RGBA buffer. It intentionally has no DOM
 * dependency so it can be tested in Node as well as used by the browser.
 */
export function analyzePixels({ data, width, height }) {
  if (!data || !width || !height || data.length < width * height * 4) {
    throw new Error('A valid RGBA image buffer is required');
  }

  const gray = new Uint8Array(width * height);
  const samples = [];
  for (let i = 0, p = 0; p < gray.length; p++, i += 4) {
    const alpha = data[i + 3] / 255;
    gray[p] = Math.round(255 * (1 - alpha) + luminance(data[i], data[i + 1], data[i + 2]) * alpha);
    if (p % 17 === 0) samples.push(gray[p]);
  }

  // Use the image's light-tone distribution as the paper baseline. This makes
  // the result stable across white and slightly grey paper photographs.
  const paperTone = percentile(samples, 0.85);
  const inkThreshold = Math.min(235, Math.max(150, paperTone - 28));
  const ink = new Uint8Array(gray.length);
  let inkPixels = 0;
  for (let p = 0; p < gray.length; p++) {
    if (gray[p] < inkThreshold) {
      ink[p] = 1;
      inkPixels++;
    }
  }

  // Edge coverage is a useful proxy for torn/cropped edges and dark damage.
  const edgeWidth = Math.max(1, Math.round(Math.min(width, height) * 0.04));
  let edgePixels = 0;
  let edgeInk = 0;
  let cornerInk = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < edgeWidth || y < edgeWidth || x >= width - edgeWidth || y >= height - edgeWidth) {
        const p = y * width + x;
        edgePixels++;
        edgeInk += ink[p];
        if ((x < edgeWidth * 3 || x >= width - edgeWidth * 3) && (y < edgeWidth * 3 || y >= height - edgeWidth * 3)) cornerInk += ink[p];
      }
    }
  }
  const edgeCoverage = edgeInk / edgePixels;
  const damage = clamp(edgeCoverage * 180 + (cornerInk / Math.max(1, Math.min(width, height) ** 2 * 0.003)) * 18);

  const marked = clamp(inkPixels / gray.length * 100);
  const damageArea = Math.min(marked, damage * 0.45);
  const printedOrMarked = Math.max(0, marked - damageArea);
  const blank = clamp(100 - printedOrMarked - damageArea);

  // Printed material tends to produce repeated horizontal transitions; freehand
  // writing has more directional changes and less row-to-row repetition.
  let horizontalTransitions = 0;
  let directionalChanges = 0;
  let activeRows = 0;
  for (let y = 1; y < height - 1; y++) {
    let rowInk = 0;
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      rowInk += ink[p];
      horizontalTransitions += ink[p] !== ink[p - 1] ? 1 : 0;
      directionalChanges += (ink[p] !== ink[p - width]) + (ink[p] !== ink[p - 1]);
    }
    if (rowInk > width * 0.03) activeRows++;
    if (rowInk > width * 0.08) horizontalTransitions += 2;
  }
  const complexity = directionalChanges / Math.max(1, horizontalTransitions);
  const writingSpread = activeRows / Math.max(1, height - 2);
  // Handwriting usually occupies many irregular rows, while the prototype's
  // printed sample is concentrated into repeated text bands.
  const type = marked < 1.5 ? 'blank' : damage >= 35 ? 'damaged' : writingSpread > 0.3 ? 'handwritten' : 'printed';
  const confidence = clamp(72 + Math.abs(marked - 50) * 0.25 - (type === 'damaged' ? 8 : 0));

  return {
    blank: Math.round(blank),
    printed: Math.round(printedOrMarked),
    damage: Math.round(damageArea),
    type,
    confidence: Math.round(confidence)
  };
}

export function analyzeImage(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return analyzePixels(context.getImageData(0, 0, canvas.width, canvas.height));
}
