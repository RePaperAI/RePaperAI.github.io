/* Classic-script scanner entry point for browsers opened from file://. */
(function () {
  const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
  const percentile = (values, fraction) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor((sorted.length - 1) * fraction)]; };
  function analyzePixels({ data, width, height }) {
    if (!data || !width || !height || data.length < width * height * 4) throw new Error('Invalid image data');
    const gray = new Uint8Array(width * height), samples = [];
    for (let i = 0, p = 0; p < gray.length; p++, i += 4) { const a = data[i + 3] / 255; gray[p] = Math.round(255 * (1 - a) + (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) * a); if (p % 17 === 0) samples.push(gray[p]); }
    const threshold = Math.min(235, Math.max(150, percentile(samples, 0.85) - 28)), ink = new Uint8Array(gray.length); let inkPixels = 0;
    for (let p = 0; p < gray.length; p++) if (gray[p] < threshold) { ink[p] = 1; inkPixels++; }
    const edgeWidth = Math.max(1, Math.round(Math.min(width, height) * 0.04)); let edgePixels = 0, edgeInk = 0, cornerInk = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { if (x < edgeWidth || y < edgeWidth || x >= width - edgeWidth || y >= height - edgeWidth) { edgePixels++; edgeInk += ink[y * width + x]; } if ((x < edgeWidth * 3 || x >= width - edgeWidth * 3) && (y < edgeWidth * 3 || y >= height - edgeWidth * 3)) cornerInk += ink[y * width + x]; }
    const damage = clamp(edgeInk / edgePixels * 180 + cornerInk / Math.max(1, Math.min(width, height) ** 2 * 0.003) * 18), marked = clamp(inkPixels / gray.length * 100), damageArea = Math.min(marked, damage * 0.45), printed = Math.max(0, marked - damageArea), blank = clamp(100 - printed - damageArea);
    let activeRows = 0; for (let y = 1; y < height - 1; y++) { let rowInk = 0; for (let x = 1; x < width - 1; x++) rowInk += ink[y * width + x]; if (rowInk > width * 0.03) activeRows++; }
    const spread = activeRows / Math.max(1, height - 2), type = marked < 1.5 ? 'blank' : damage >= 35 ? 'damaged' : spread > 0.3 ? 'handwritten' : 'printed';
    return { blank: Math.round(blank), printed: Math.round(printed), damage: Math.round(damageArea), type, confidence: Math.round(clamp(72 + Math.abs(marked - 50) * 0.25 - (type === 'damaged' ? 8 : 0))) };
  }
  function analyzeImage(image) { const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth || image.width; canvas.height = image.naturalHeight || image.height; const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) throw new Error('Canvas is not available in this browser'); context.drawImage(image, 0, 0, canvas.width, canvas.height); return analyzePixels(context.getImageData(0, 0, canvas.width, canvas.height)); }
  window.RePaperScanner = { analyzePixels, analyzeImage };
}());
