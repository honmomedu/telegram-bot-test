// Lightweight wrapper around @vladmandic/face-api for in-browser face
// enrollment + verification. All functions are client-side only.

type FaceApi = typeof import('@vladmandic/face-api');

let faceapi: FaceApi | null = null;
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

const MODEL_URL = '/models';

// Distance below which two faces are considered the same person.
// 0.6 is the face-api.js default; 0.5 is a stricter, safer threshold.
export const MATCH_THRESHOLD = 0.5;

/** Load the face-api library + weights once. Safe to call repeatedly. */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const mod = await import('@vladmandic/face-api');
    faceapi = mod;

    // Prefer WebGL, fall back to CPU automatically.
    try {
      const tf = faceapi.tf as any;
      await tf.setBackend?.('webgl');
      await tf.ready?.();
    } catch {
      // ignore — face-api will use whatever backend is available
    }

    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

export type FaceInput =
  | HTMLVideoElement
  | HTMLImageElement
  | HTMLCanvasElement;

/**
 * Detect a single face and return its 128-dimension descriptor.
 * Returns null when no face (or more than the most prominent one) is found.
 */
export async function getFaceDescriptor(input: FaceInput): Promise<Float32Array | null> {
  await loadFaceModels();
  if (!faceapi) return null;

  const detection = await faceapi
    .detectSingleFace(
      input as Parameters<FaceApi['detectSingleFace']>[0],
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }),
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor ?? null;
}

/** Euclidean distance between two descriptors. Lower = more similar. */
export function faceDistance(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** True when the two faces are the same person within MATCH_THRESHOLD. */
export function isSameFace(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  threshold: number = MATCH_THRESHOLD,
): boolean {
  return faceDistance(a, b) < threshold;
}

/** Convert a 0..1 distance into a friendly confidence percentage. */
export function matchConfidence(distance: number): number {
  // distance 0 -> 100%, distance >= threshold*2 -> ~0%
  const pct = Math.max(0, Math.min(1, 1 - distance / (MATCH_THRESHOLD * 2)));
  return Math.round(pct * 100);
}
