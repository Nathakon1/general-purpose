// Browser-only: image decoding, QR scan and OCR. One tesseract worker, reused.
import jsQR from 'jsqr';
import { createWorker, type Worker } from 'tesseract.js';
import { parseSlipQr, type SlipQr } from './qr';

const BASE = import.meta.env.BASE_URL;
let workerPromise: Promise<Worker> | null = null;

export function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker(['tha', 'eng'], 1, {
    workerPath: `${BASE}ocr/worker.min.js`,
    corePath: `${BASE}ocr/core`,
    langPath: `${BASE}ocr/lang`,
    gzip: true,
    workerBlobURL: false,
  }).then(async (w) => {
    await w.setParameters({ preserve_interword_spaces: '1' });
    return w;
  });
  return workerPromise;
}

export async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function canvasFor(bmp: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d', { willReadFrequently: true })!.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

export function scanQr(bmp: ImageBitmap): SlipQr | null {
  // Try full image, then the lower half (slip QRs usually sit near the bottom).
  for (const side of [1400, 900]) {
    const c = canvasFor(bmp, side);
    const ctx = c.getContext('2d')!;
    const regions: [number, number, number, number][] = [
      [0, 0, c.width, c.height],
      [0, Math.floor(c.height / 2), c.width, Math.ceil(c.height / 2)],
    ];
    for (const [x, y, w, h] of regions) {
      const img = ctx.getImageData(x, y, w, h);
      const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
      const parsed = code ? parseSlipQr(code.data) : null;
      if (parsed) return parsed;
    }
  }
  return null;
}

/** Grayscale + upscale small images so Thai diacritics survive OCR. */
function ocrCanvas(bmp: ImageBitmap): HTMLCanvasElement {
  const target = 1600;
  const scale = Math.min(2.5, target / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.filter = 'grayscale(1) contrast(1.2)';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

export async function ocrText(bmp: ImageBitmap): Promise<string> {
  const w = await getWorker();
  const { data } = await w.recognize(ocrCanvas(bmp));
  // Tesseract puts spaces between Thai characters; drop spaces between two Thai letters.
  return data.text.replace(/(?<=[฀-๿]) (?=[฀-๿])/g, '');
}

/** A downscaled JPEG to store, so slips do not fill the phone. */
export async function thumbnail(bmp: ImageBitmap): Promise<Blob> {
  const c = canvasFor(bmp, 1200);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.8));
}

export async function sha256(file: Blob): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
