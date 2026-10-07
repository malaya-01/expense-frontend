/** Legacy device copy. New enrollments are stored encrypted on the account. */
export const FACE_LOGIN_STORAGE_KEY = "finos:face_login";

const LEGACY_BIOMETRIC_FLAG = "finos:face_unlock_enrolled";

export type FaceLoginProfile = {
  userId: string;
  email: string;
  descriptor: number[];
  /** Small mirrored still from enrollment, for the settings preview only. */
  preview?: string;
  refreshToken: string;
  enrolledAt: string;
};

function parseProfile(raw: string | null | undefined): FaceLoginProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FaceLoginProfile;
    if (!parsed?.userId || !parsed.email || !parsed.refreshToken) return null;
    if (!Array.isArray(parsed.descriptor) || parsed.descriptor.length < 64) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readFaceLoginProfileSync(): FaceLoginProfile | null {
  if (typeof window === "undefined") return null;
  try {
    return parseProfile(localStorage.getItem(FACE_LOGIN_STORAGE_KEY));
  } catch {
    return null;
  }
}

async function mirrorNative(value: string | null): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import("@capacitor/preferences");
    if (value) {
      await Preferences.set({ key: FACE_LOGIN_STORAGE_KEY, value });
    } else {
      await Preferences.remove({ key: FACE_LOGIN_STORAGE_KEY });
    }
  } catch {
    /* web, or Preferences unavailable */
  }
}

export async function writeFaceLoginProfile(
  profile: FaceLoginProfile | null,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (profile) {
    const raw = JSON.stringify(profile);
    localStorage.setItem(FACE_LOGIN_STORAGE_KEY, raw);
    await mirrorNative(raw);
    return;
  }
  localStorage.removeItem(FACE_LOGIN_STORAGE_KEY);
  await mirrorNative(null);
}

export async function clearFaceLoginProfile(): Promise<void> {
  await writeFaceLoginProfile(null);
}

/** Copy a native-only profile into localStorage and drop the old biometric flag. */
export async function hydrateFaceLoginProfile(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_BIOMETRIC_FLAG);
  } catch {
    /* ignore */
  }
  if (readFaceLoginProfileSync()) return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: FACE_LOGIN_STORAGE_KEY });
    const profile = parseProfile(value);
    if (!profile) return;
    localStorage.setItem(FACE_LOGIN_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

/** Face templates live on the account now, not in a device token. */
export async function syncFaceLoginRefresh(
  _accessToken?: string,
  _refreshToken?: string,
): Promise<void> {
  return;
}
