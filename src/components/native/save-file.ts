import { Capacitor } from "@capacitor/core";

export type SaveFileResult =
  | { kind: "web"; name: string }
  | { kind: "native"; name: string; path: string; uri: string };

function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || `export-${Date.now()}.txt`;
}

/**
 * Save a text file in a way that works on both targets.
 *
 * - Web: triggers a normal browser download via a temporary object URL
 *   (revoked after a delay so the download has time to start).
 * - Capacitor (Android WebView): `<a download href="blob:">` does nothing
 *   there, so the file is written with @capacitor/filesystem instead —
 *   Documents first, app storage as a fallback — and the saved path returned.
 *
 * Throws if nothing could be written, so callers never report false success.
 */
export async function saveTextFile(
  name: string,
  content: string,
  mime = "text/plain",
): Promise<SaveFileResult> {
  const fileName = safeFileName(name);

  if (Capacitor.isNativePlatform()) {
    const { Directory, Encoding, Filesystem } = await import(
      "@capacitor/filesystem"
    );
    const targets: Array<{ directory: (typeof Directory)[keyof typeof Directory]; label: string }> = [
      { directory: Directory.Documents, label: "Documents" },
      { directory: Directory.Data, label: "App storage" },
    ];
    let lastError: unknown = null;
    for (const target of targets) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: target.directory,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        return {
          kind: "native",
          name: fileName,
          path: `${target.label}/${fileName}`,
          uri: result.uri,
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Could not save the file on this device.");
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { kind: "web", name: fileName };
}
