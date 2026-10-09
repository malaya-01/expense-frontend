/**
 * Over-the-air web updates for the Android app (self-hosted, no Capgo cloud).
 *
 * `.github/workflows/mobile-ota.yml` publishes every push to `main` as a zip of
 * the static export plus `latest.json` on the rolling `ota` GitHub release.
 * The app checks that manifest on launch and on resume, downloads newer
 * bundles in the background and applies them the next time the app is
 * backgrounded or restarted. Native changes (plugins, android/, capacitor
 * config) still need a new APK — see MOBILE.md.
 */

const MANIFEST_URL =
  "https://github.com/malaya-01/expense-frontend/releases/download/ota/latest.json";

/** Baked in by CI; local/Android Studio builds report "dev". */
export const BUNDLE_VERSION = process.env.NEXT_PUBLIC_OTA_VERSION || "dev";

type OtaManifest = {
  version: string;
  url: string;
  checksum: string;
  /** Lowest Android versionCode whose native layer can run this bundle. */
  minNativeBuild: number;
};

type Updater = typeof import("@capgo/capacitor-updater").CapacitorUpdater;

let started = false;
let checking = false;

async function fetchManifest(): Promise<OtaManifest | null> {
  const res = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<OtaManifest>;
  if (!data.version || !data.url || !data.checksum) return null;
  return {
    version: data.version,
    url: data.url,
    checksum: data.checksum,
    minNativeBuild: Number(data.minNativeBuild) || 0,
  };
}

async function checkForUpdate(updater: Updater): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    const manifest = await fetchManifest();
    if (!manifest || manifest.version === BUNDLE_VERSION) return;

    // A bundle built for newer native code (new plugin, etc.) would break on
    // this APK — wait for the user to install the new APK instead.
    const { App } = await import("@capacitor/app");
    const nativeBuild = Number((await App.getInfo()).build) || 0;
    if (nativeBuild < manifest.minNativeBuild) return;

    const { bundles } = await updater.list();
    const existing = bundles.find((b) => b.version === manifest.version);
    // Failed bundles are kept (autoDeleteFailed: false) so a broken release
    // is not re-downloaded and rolled back on every launch.
    if (existing?.status === "error" || existing?.status === "downloading") {
      return;
    }

    const bundle =
      existing && existing.status !== "deleted"
        ? existing
        : await updater.download({
            url: manifest.url,
            version: manifest.version,
            checksum: manifest.checksum,
          });
    await updater.next({ id: bundle.id });
  } catch {
    // Offline or GitHub unreachable — keep the current bundle, retry later.
  } finally {
    checking = false;
  }
}

export async function initLiveUpdates(): Promise<void> {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
    // Must run on every launch, otherwise the plugin assumes this bundle is
    // broken and rolls back to the previous one.
    await CapacitorUpdater.notifyAppReady();

    const { App } = await import("@capacitor/app");
    await App.addListener("resume", () => {
      void checkForUpdate(CapacitorUpdater);
    });
    await checkForUpdate(CapacitorUpdater);
  } catch {
    /* web, or plugin missing from an older APK */
  }
}
