/** Compress a receipt photo so it fits the API body without storing the file. */
const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.72;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this file"));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

export async function fileToReceiptPayload(file: File): Promise<{
  name: string;
  mime_type: string;
  data_base64: string;
  preview_url: string;
}> {
  const previewUrl = URL.createObjectURL(file);
  const isPdf =
    file.type === "application/pdf" ||
    /\.pdf$/i.test(file.name);
  if (isPdf) {
    if (file.size > 3_500_000) {
      URL.revokeObjectURL(previewUrl);
      throw new Error("PDF is too large. Photograph the receipt instead.");
    }
    return {
      name: file.name || "receipt.pdf",
      mime_type: "application/pdf",
      data_base64: await blobToBase64(file),
      preview_url: previewUrl,
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare this image");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => (next ? resolve(next) : reject(new Error("Could not compress this image"))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
    return {
      name: (file.name || "receipt").replace(/\.[^.]+$/, "") + ".jpg",
      mime_type: "image/jpeg",
      data_base64: await blobToBase64(blob),
      preview_url: previewUrl,
    };
  } catch {
    if (file.size > 3_500_000) {
      URL.revokeObjectURL(previewUrl);
      throw new Error("This image is too large. Try a screenshot or a closer photo.");
    }
    return {
      name: file.name || "receipt.jpg",
      mime_type: file.type || "image/jpeg",
      data_base64: await blobToBase64(file),
      preview_url: previewUrl,
    };
  }
}
