/**
 * Most frequent color of an RGBA pixel buffer.
 *
 * Each channel is split into `levels` equal steps, which groups similar colors
 * into one bucket. The bucket with the most pixels wins (the lowest bucket
 * index on a tie) and the average color of its pixels is returned. Mostly
 * transparent pixels are ignored. Returns null when no pixel counts.
 */
export function dominantColor(pixels, { levels = 16, alphaThreshold = 128 } = {}) {
  const step = 256 / levels;
  const bucketCount = levels ** 3;
  const counts = new Uint32Array(bucketCount);
  const sums = new Float64Array(bucketCount * 3);

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < alphaThreshold) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const bucket = (Math.floor(r / step) * levels + Math.floor(g / step)) * levels + Math.floor(b / step);
    counts[bucket] += 1;
    sums[bucket * 3] += r;
    sums[bucket * 3 + 1] += g;
    sums[bucket * 3 + 2] += b;
  }

  let best = -1;
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    if (counts[bucket] > 0 && (best === -1 || counts[bucket] > counts[best])) best = bucket;
  }
  if (best === -1) return null;

  return {
    r: Math.round(sums[best * 3] / counts[best]),
    g: Math.round(sums[best * 3 + 1] / counts[best]),
    b: Math.round(sums[best * 3 + 2] / counts[best])
  };
}

/** "#rrggbb" for a {r, g, b} color. */
export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Dominant color of a loaded image or video frame as "#rrggbb", or null.
 * The source is drawn onto a small canvas first so large pictures stay cheap.
 * Needs a browser (canvas); the color math itself is in dominantColor.
 */
export function sampleSourceColor(source, width, height, maxSize = 64) {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const sampleWidth = Math.max(1, Math.round(width * scale));
  const sampleHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0, sampleWidth, sampleHeight);

  const color = dominantColor(context.getImageData(0, 0, sampleWidth, sampleHeight).data);
  return color ? rgbToHex(color) : null;
}
