/**
 * Lightweight, dependency-free "face descriptor" extractor.
 *
 * IMPORTANT: this is NOT real face recognition. The backend (server.ts)
 * explicitly simulates biometric matching by comparing two 128-length
 * float vectors with a Euclidean-distance threshold. This module produces
 * that shaped vector from a downsampled grayscale grid of the captured
 * frame, so the demo flow (register once, then match on check-in/out)
 * works end-to-end without shipping a real ML model to the client.
 *
 * For a production system, swap this out for a proper library
 * (e.g. face-api.js / MediaPipe FaceMesh) that yields real embeddings,
 * and keep the same (userId, descriptor: number[]) contract.
 */

const GRID_W = 16;
const GRID_H = 8; // 16 * 8 = 128, matching schema.sql's 128-dim comment

export function extractDescriptorFromVideo(video: HTMLVideoElement): number[] {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_W;
  canvas.height = GRID_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Array(GRID_W * GRID_H).fill(0);

  // Crop to a centered square so the descriptor is mostly "face" if the
  // user frames themselves roughly in the middle of the preview.
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  ctx.drawImage(video, sx, sy, side, side, 0, 0, GRID_W, GRID_H);
  const { data } = ctx.getImageData(0, 0, GRID_W, GRID_H);

  const descriptor: number[] = [];
  for (let i = 0; i < GRID_W * GRID_H; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // 0..1
    descriptor.push(Number(luminance.toFixed(4)));
  }
  return descriptor;
}

export async function captureFrameDataUrl(video: HTMLVideoElement): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 240;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}
