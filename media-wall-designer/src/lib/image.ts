/**
 * Client-side image work: EXIF-safe downscale, rotate/straighten, crop.
 * Photos are resized before upload so they fit D1's value limit when no R2
 * bucket is bound, and so a 12 MP phone photo doesn't stall on hotel wifi.
 */
export const MAX_UPLOAD_BYTES = 850_000;
export const MAX_DIMENSION = 2000;

export interface PreparedImage { blob: Blob; width: number; height: number; dataUrl: string }

export async function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = url;
  });
  return img;
}

/**
 * Downscale, apply rotation and crop, and step JPEG quality down until the
 * result fits. Returns the blob plus a data URL for immediate display.
 */
export async function prepareImage(
  file: Blob,
  opts: { rotateDeg?: number; crop?: { x: number; y: number; w: number; h: number } | null; maxBytes?: number } = {},
): Promise<PreparedImage> {
  const img = await loadImage(file);
  const rotate = ((opts.rotateDeg ?? 0) * Math.PI) / 180;
  const crop = opts.crop;

  const srcW = crop ? crop.w * img.naturalWidth : img.naturalWidth;
  const srcH = crop ? crop.h * img.naturalHeight : img.naturalHeight;
  const srcX = crop ? crop.x * img.naturalWidth : 0;
  const srcY = crop ? crop.y * img.naturalHeight : 0;

  // Rotating inside the frame needs the bounding box of the rotated rect.
  const cos = Math.abs(Math.cos(rotate));
  const sin = Math.abs(Math.sin(rotate));
  const rotW = srcW * cos + srcH * sin;
  const rotH = srcW * sin + srcH * cos;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(rotW, rotH));
  const outW = Math.round(rotW * scale);
  const outH = Math.round(rotH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, outW, outH);
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);

  const maxBytes = opts.maxBytes ?? MAX_UPLOAD_BYTES;
  let quality = 0.86;
  let blob = await toBlob(canvas, quality);
  while (blob.size > maxBytes && quality > 0.36) {
    quality -= 0.1;
    blob = await toBlob(canvas, quality);
  }
  if (blob.size > maxBytes) {
    // Still too big — shrink the pixels rather than destroy the quality.
    const shrink = Math.sqrt(maxBytes / blob.size) * 0.95;
    const c2 = document.createElement('canvas');
    c2.width = Math.round(outW * shrink);
    c2.height = Math.round(outH * shrink);
    c2.getContext('2d')!.drawImage(canvas, 0, 0, c2.width, c2.height);
    blob = await toBlob(c2, 0.8);
    return { blob, width: c2.width, height: c2.height, dataUrl: c2.toDataURL('image/jpeg', 0.8) };
  }
  return { blob, width: outW, height: outH, dataUrl: canvas.toDataURL('image/jpeg', quality) };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality));
}
