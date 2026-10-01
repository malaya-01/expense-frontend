/** Weights shipped in public/models (web and the Capacitor shell). */
const MODEL_URI = "/models";

/** Lower is a closer match. 0.6 is the usual face-api cutoff; this is a bit stricter. */
export const FACE_MATCH_DISTANCE = 0.55;

export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FaceSample = {
  score: number;
  box: FaceBox;
  descriptor: Float32Array;
};

type DetectedFace = {
  detection: { score: number; box: FaceBox };
  descriptor: Float32Array;
};

type FaceApi = {
  tf: {
    setBackend: (name: string) => Promise<boolean>;
    ready: () => Promise<void>;
    getBackend: () => string;
  };
  nets: {
    tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void> };
    faceLandmark68Net: { loadFromUri: (uri: string) => Promise<void> };
    faceRecognitionNet: { loadFromUri: (uri: string) => Promise<void> };
  };
  TinyFaceDetectorOptions: new (options: {
    inputSize: number;
    scoreThreshold: number;
  }) => object;
  detectSingleFace: (
    input: HTMLVideoElement,
    options: object,
  ) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<DetectedFace | undefined>;
    };
  };
};

let enginePromise: Promise<FaceApi> | null = null;

export function loadFaceEngine(): Promise<FaceApi> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const faceapi = (await import("@vladmandic/face-api")) as unknown as FaceApi;
      const backend = faceapi.tf.getBackend();
      if (backend !== "webgl") {
        try {
          await faceapi.tf.setBackend("webgl");
        } catch {
          await faceapi.tf.setBackend("cpu");
        }
      }
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
      ]);
      return faceapi;
    })().catch((error: unknown) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

export async function readFaceFromVideo(
  video: HTMLVideoElement,
): Promise<FaceSample | null> {
  if (!video.videoWidth || video.readyState < 2) return null;
  const faceapi = await loadFaceEngine();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.45,
  });
  const hit = await faceapi
    .detectSingleFace(video, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!hit?.descriptor || hit.descriptor.length < 64) return null;
  const box = hit.detection.box;
  return {
    score: hit.detection.score,
    box: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    },
    descriptor: hit.descriptor,
  };
}

export function assessFace(
  sample: FaceSample,
  video: HTMLVideoElement,
): { ok: boolean; hint: string } {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const { box, score } = sample;
  if (score < 0.72) {
    return { ok: false, hint: "Face the camera in better light" };
  }
  if (box.width < vw * 0.22) {
    return { ok: false, hint: "Move a little closer" };
  }
  if (box.width > vw * 0.78) {
    return { ok: false, hint: "Move a little back" };
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (cx < vw * 0.28 || cx > vw * 0.72 || cy < vh * 0.18 || cy > vh * 0.78) {
    return { ok: false, hint: "Center your face in the oval" };
  }
  return { ok: true, hint: "Hold still" };
}

export function descriptorDistance(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): number {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

export function averageDescriptors(list: Float32Array[]): Float32Array {
  const out = new Float32Array(list[0].length);
  for (const descriptor of list) {
    for (let i = 0; i < out.length; i += 1) out[i] += descriptor[i];
  }
  let norm = 0;
  for (let i = 0; i < out.length; i += 1) {
    out[i] /= list.length;
    norm += out[i] * out[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < out.length; i += 1) out[i] /= norm;
  return out;
}

export function descriptorsAgree(
  list: Float32Array[],
  maxDistance = 0.45,
): boolean {
  if (list.length < 2) return false;
  const mean = averageDescriptors(list);
  return list.every(
    (descriptor) => descriptorDistance(descriptor, mean) <= maxDistance,
  );
}
