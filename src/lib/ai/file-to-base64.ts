/** Read a File in chunks and report real byte progress (0–100). */
export async function fileToBase64WithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const chunkSize = 256 * 1024;
  const total = Math.max(1, file.size);
  const chunks: Uint8Array[] = [];
  let offset = 0;

  while (offset < file.size) {
    const buffer = new Uint8Array(
      await file.slice(offset, offset + chunkSize).arrayBuffer(),
    );
    chunks.push(buffer);
    offset += buffer.byteLength;
    onProgress?.(Math.min(100, Math.round((offset / total) * 100)));
  }

  const merged = new Uint8Array(offset);
  let position = 0;
  for (const chunk of chunks) {
    merged.set(chunk, position);
    position += chunk.byteLength;
  }

  // btoa needs a binary string; encode in slices to avoid call-stack limits.
  let binary = "";
  const slice = 0x8000;
  for (let i = 0; i < merged.length; i += slice) {
    binary += String.fromCharCode(...merged.subarray(i, i + slice));
  }
  return btoa(binary);
}
