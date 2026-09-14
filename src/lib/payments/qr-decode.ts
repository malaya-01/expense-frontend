import jsQR from "jsqr";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = url;
  });
}

function readQrFromCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width < 8 || canvas.height < 8) return null;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const found = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  return found?.data?.trim() || null;
}

function drawScaled(
  image: CanvasImageSource,
  width: number,
  height: number,
  maxEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Decode a UPI QR from a gallery/file image. Avoids createImageBitmap (unreliable in WebView). */
export async function decodeQrFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    for (const maxEdge of [1600, 1024, 800, image.width]) {
      const canvas = drawScaled(image, image.width, image.height, maxEdge);
      const value = readQrFromCanvas(canvas);
      if (value) return value;
    }
    throw new Error("No QR code found in that image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener(
      "change",
      () => resolve(input.files?.[0] || null),
      { once: true },
    );
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message || "");
  }
  return String(error || "");
}

export function isScanCanceledError(error: unknown): boolean {
  return /cancel/i.test(errorMessage(error));
}
