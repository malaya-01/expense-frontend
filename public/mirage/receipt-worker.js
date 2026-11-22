/* On-phone Mirage. Text only: boxes, masks and scene captions are slower
 * and the receipt form only needs the writing.
 *
 * Runtime is shipped with the app (/cactus). Weights are cached after the
 * user accepts the download prompt.
 */

/* global createCactus */

const RUNTIME_URL = "/cactus/cactus.js";
const WASM_URL = "/cactus/cactus.wasm";
const MODEL_URL =
  "https://huggingface.co/Cactus-Compute/mirage/resolve/main/mirage.cact";
const MODEL_CACHE = "finos-mirage-v1";
const OPTIONS = JSON.stringify({
  sections: ["text"],
  fields: ["bbox", "score"],
  text_conf: 0.3,
  max_text_lines: 40,
  max_tokens: 24,
});
const OUTPUT_CAPACITY = 1 << 20;
const MAX_PIXELS = 1_200_000;
const CACTUS_VISION = 4;

importScripts(RUNTIME_URL);

let runtimePromise = null;
let runtime = null;
let outputPointer = 0;
let optionsPointer = 0;

function fail(id, error) {
  self.postMessage({
    type: "error",
    id,
    message: error instanceof Error ? error.message : String(error),
  });
}

function allocString(rt, value) {
  const bytes = new TextEncoder().encode(`${value}\0`);
  const pointer = rt._malloc(bytes.length);
  rt.HEAPU8.set(bytes, pointer);
  return pointer;
}

function readError(rt) {
  try {
    return rt.UTF8ToString(rt._cactus_last_error());
  } catch {
    return "";
  }
}

async function loadBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function loadModel() {
  if (typeof caches === "undefined") {
    throw new Error("model-missing");
  }
  const cache = await caches.open(MODEL_CACHE);
  const hit = await cache.match(MODEL_URL);
  if (!hit) throw new Error("model-missing");
  const bytes = new Uint8Array(await hit.arrayBuffer());
  if (bytes.byteLength < 1_000_000) throw new Error("model-missing");
  return bytes;
}

function ensureRuntime() {
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    const wasmBinary = await loadBytes(WASM_URL);
    const model = await loadModel();
    const rt = await createCactus({ wasmBinary });
    const modelPointer = rt._malloc(model.byteLength);
    rt.HEAPU8.set(model, modelPointer);
    if (rt._cactus_load(modelPointer, BigInt(model.byteLength)) !== 0) {
      throw new Error(readError(rt) || "Mirage weights failed to load");
    }
    if ((rt._cactus_models() & CACTUS_VISION) === 0) {
      throw new Error("This archive has no vision model");
    }
    rt._cactus_init(allocString(rt, ""), 0, 0);
    outputPointer = rt._malloc(OUTPUT_CAPACITY);
    optionsPointer = allocString(rt, OPTIONS);
    runtime = rt;
    return rt;
  })().catch((error) => {
    runtimePromise = null;
    throw error;
  });
  return runtimePromise;
}

function boxOrigin(item) {
  const bbox = item.bbox || item.box;
  if (Array.isArray(bbox) && bbox.length >= 2) return [Number(bbox[0]) || 0, Number(bbox[1]) || 0];
  if (bbox && typeof bbox === "object") {
    return [Number(bbox.x || bbox.x1) || 0, Number(bbox.y || bbox.y1) || 0];
  }
  return [0, 0];
}

function flattenText(result) {
  let raw = result;
  if (result && typeof result === "object") {
    raw = result.text || result.texts || result.lines || [];
  }
  if (typeof raw === "string") return raw.trim();
  if (!Array.isArray(raw)) return "";
  const placed = [];
  for (const item of raw) {
    if (typeof item === "string") {
      if (item.trim()) placed.push([0, 0, item.trim()]);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const score = item.score ?? item.text_conf ?? item.conf;
    if (score != null && Number(score) < 0.25) continue;
    const text = String(item.text || item.content || item.value || "").trim();
    if (!text) continue;
    const [x, y] = boxOrigin(item);
    placed.push([y, x, text]);
  }
  placed.sort((a, b) => Math.round(a[0] / 28) - Math.round(b[0] / 28) || a[1] - b[1]);
  const lines = [];
  let bucket = [];
  let bucketY = null;
  for (const [y, , text] of placed) {
    if (bucketY == null || Math.abs(y - bucketY) <= 18) {
      bucket.push(text);
      if (bucketY == null) bucketY = y;
    } else {
      lines.push(bucket.join(" "));
      bucket = [text];
      bucketY = y;
    }
  }
  if (bucket.length) lines.push(bucket.join(" "));
  return lines.join("\n").trim();
}

function describe(rgb, width, height) {
  if (width * height > MAX_PIXELS) throw new Error("Image is too large");
  if (rgb.byteLength !== width * height * 3) throw new Error("Unexpected image buffer");
  const pointer = runtime._malloc(rgb.byteLength);
  runtime.HEAPU8.set(rgb, pointer);
  const started = performance.now();
  try {
    const result = runtime._cactus_describe(
      pointer,
      width,
      height,
      optionsPointer,
      0,
      0,
      outputPointer,
      OUTPUT_CAPACITY,
    );
    if (result < 0) throw new Error(readError(runtime) || "Mirage inference failed");
    const json = runtime.UTF8ToString(outputPointer);
    if (!json) throw new Error("Mirage returned an empty result");
    let parsed = json;
    try {
      parsed = JSON.parse(json);
    } catch {
      parsed = json;
    }
    return { text: flattenText(parsed), ms: performance.now() - started };
  } finally {
    runtime._free(pointer);
  }
}

self.onmessage = async (event) => {
  const message = event.data || {};
  if (message.type === "warm") {
    try {
      await ensureRuntime();
      self.postMessage({ type: "ready" });
    } catch (error) {
      fail(undefined, error);
    }
    return;
  }
  if (message.type !== "describe") return;
  try {
    await ensureRuntime();
    const { text, ms } = describe(
      new Uint8Array(message.rgb),
      message.width,
      message.height,
    );
    self.postMessage({ type: "result", id: message.id, text, ms });
  } catch (error) {
    fail(message.id, error);
  }
};
