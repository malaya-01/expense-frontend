"use client";

import { Capacitor } from "@capacitor/core";
import {
  BiometryType,
  NativeBiometric,
} from "@capgo/capacitor-native-biometric";
import { APP_NAME } from "@/lib/brand";

const CREDENTIAL_SERVER = "com.finos.app.face-unlock";
const META_KEY = "opal:face_unlock";
const PROMPTED_KEY = "opal:face_unlock_prompted";
const SESSION_KEY = "opal:face_unlock_session";

const AVAILABILITY_TIMEOUT_MS = 8_000;
const VERIFY_TIMEOUT_MS = 75_000;
const CREDENTIAL_TIMEOUT_MS = 12_000;

/** Survives logout so cold start can skip silent session restore. */
export const FACE_UNLOCK_ENROLLED_STORAGE_KEY = "finos:face_unlock_enrolled";

export type FaceUnlockMeta = {
  enabled: true;
  userId: string;
  email: string;
  biometryType: number;
  label: string;
};

export type FaceUnlockAvailability = {
  available: boolean;
  biometryType: BiometryType;
  label: string;
  errorCode?: number;
  hint: string;
  deviceIsSecure: boolean;
};

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function writeEnrolledFlag(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      localStorage.setItem(FACE_UNLOCK_ENROLLED_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(FACE_UNLOCK_ENROLLED_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function isFaceUnlockEnrolledSync(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FACE_UNLOCK_ENROLLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isFaceUnlockSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFaceUnlockSessionActive(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearFaceUnlockSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Enrolled on this device and this JS process has not unlocked yet. */
export function isSilentRestoreBlocked(): boolean {
  return isFaceUnlockEnrolledSync() && !isFaceUnlockSessionActive();
}

export function biometryLabel(type: BiometryType | number): string {
  switch (type) {
    case BiometryType.FACE_ID:
    case BiometryType.FACE_AUTHENTICATION:
      return "Face Unlock";
    case BiometryType.TOUCH_ID:
    case BiometryType.FINGERPRINT:
      return "Fingerprint";
    case BiometryType.IRIS_AUTHENTICATION:
      return "Iris";
    case BiometryType.MULTIPLE:
      return "Face or fingerprint";
    default:
      return "Face or fingerprint";
  }
}

export function biometryUnlockCta(label: string): string {
  if (/finger|touch/i.test(label) && !/face/i.test(label)) {
    return "Unlock with fingerprint";
  }
  return "Unlock with Face or fingerprint";
}

export function isFaceUnlockCanceled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const rec = error as { code?: number | string; message?: string };
  const code = Number(rec.code);
  if (code === 16 || code === 15 || code === 11 || code === 17) return true;
  return /cancel/i.test(String(rec.message || ""));
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function pluginErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") {
    return typeof error === "string" && error.trim() ? error : fallback;
  }
  const rec = error as { message?: string; errorDetails?: string };
  const text = String(rec.message || rec.errorDetails || "").trim();
  return text || fallback;
}

function availabilityHint(errorCode?: number): string {
  switch (errorCode) {
    case 3:
      return "This phone has no Face Unlock or fingerprint enrolled. Add one in Android Settings → Security, then tap Check again.";
    case 1:
      return "Biometrics are temporarily unavailable. Wait a moment, then tap Check again.";
    case 2:
    case 4:
      return "Too many failed attempts. Unlock the phone with your PIN, then try again.";
    case 14:
      return "Set a screen lock (PIN, pattern, or password) in Android Settings first.";
    default:
      return "Opal could not reach Face Unlock or fingerprint on this phone. Check Android Settings → Security, then tap Check again.";
  }
}

async function readMeta(): Promise<FaceUnlockMeta | null> {
  if (!isNative()) {
    writeEnrolledFlag(false);
    return null;
  }
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await withTimeout(
      Preferences.get({ key: META_KEY }),
      AVAILABILITY_TIMEOUT_MS,
      "Could not read Face Unlock settings.",
    );
    if (!value) {
      writeEnrolledFlag(false);
      return null;
    }
    const parsed = JSON.parse(value) as FaceUnlockMeta;
    if (!parsed?.enabled || !parsed.userId || !parsed.email) {
      writeEnrolledFlag(false);
      return null;
    }
    writeEnrolledFlag(true);
    return parsed;
  } catch {
    return null;
  }
}

async function writeMeta(meta: FaceUnlockMeta | null): Promise<void> {
  if (!isNative()) return;
  const { Preferences } = await import("@capacitor/preferences");
  if (meta) {
    await Preferences.set({ key: META_KEY, value: JSON.stringify(meta) });
    writeEnrolledFlag(true);
  } else {
    await Preferences.remove({ key: META_KEY });
    writeEnrolledFlag(false);
  }
}

export async function getFaceUnlockMeta(): Promise<FaceUnlockMeta | null> {
  return readMeta();
}

export async function isFaceUnlockEnabled(): Promise<boolean> {
  return Boolean(await readMeta());
}

export async function getFaceUnlockAvailability(): Promise<FaceUnlockAvailability> {
  if (!isNative()) {
    return {
      available: false,
      biometryType: BiometryType.NONE,
      label: "Biometrics",
      hint: `Face or fingerprint unlock is available in the ${APP_NAME} Android app.`,
      deviceIsSecure: false,
    };
  }
  try {
    const result = await withTimeout(
      NativeBiometric.isAvailable({ useFallback: false }),
      AVAILABILITY_TIMEOUT_MS,
      "Checking Face Unlock timed out. Close the app and try again.",
    );
    const errorCode =
      typeof result.errorCode === "number" ? result.errorCode : undefined;
    return {
      available: Boolean(result.isAvailable),
      biometryType: result.biometryType,
      label: biometryLabel(result.biometryType),
      errorCode,
      hint: result.isAvailable
        ? "The phone can use Face Unlock or a fingerprint — whichever it offers."
        : availabilityHint(errorCode),
      deviceIsSecure: Boolean(result.deviceIsSecure),
    };
  } catch (error) {
    return {
      available: false,
      biometryType: BiometryType.NONE,
      label: "Biometrics",
      hint: pluginErrorMessage(error, availabilityHint()),
      deviceIsSecure: false,
    };
  }
}

async function verifyUnlock(label: string): Promise<void> {
  try {
    await withTimeout(
      NativeBiometric.verifyIdentity({
        reason: `Unlock ${APP_NAME} with Face or fingerprint`,
        title: label,
        subtitle: APP_NAME,
        description: "Use Face Unlock or your fingerprint to continue.",
        negativeButtonText: "Cancel",
        maxAttempts: 5,
        useFallback: false,
      }),
      VERIFY_TIMEOUT_MS,
      "The phone never showed a Face Unlock or fingerprint prompt. Unlock the screen, then try again.",
    );
  } catch (error) {
    if (isFaceUnlockCanceled(error)) throw error;
    throw new Error(
      pluginErrorMessage(
        error,
        "The phone could not confirm it was you. Try Face Unlock or your fingerprint again.",
      ),
    );
  }
}

function encodeUser(userId: string, email: string): string {
  return JSON.stringify({ userId, email });
}

function decodeUser(username: string): { userId: string; email: string } {
  const parsed = JSON.parse(username) as { userId?: string; email?: string };
  if (!parsed?.userId || !parsed.email) {
    throw new Error("Saved Face Unlock data is invalid.");
  }
  return { userId: parsed.userId, email: parsed.email };
}

async function persistRefreshPolicy(refreshToken: string, persist: boolean) {
  const { getAccessToken, setTokens } = await import("@/lib/api/client");
  const access = getAccessToken();
  if (access) setTokens(access, refreshToken, { persistRefresh: persist });
}

export async function enrollFaceUnlock(input: {
  userId: string;
  email: string;
  refreshToken: string;
}): Promise<FaceUnlockMeta> {
  if (!isNative()) {
    throw new Error("Face Unlock is only available in the Opal Android app.");
  }
  if (!input.refreshToken) {
    throw new Error("Sign in with your password once, then enable Face Unlock.");
  }
  const availability = await getFaceUnlockAvailability();
  const label = availability.label || "Face or fingerprint";
  await verifyUnlock(label);
  try {
    await withTimeout(
      NativeBiometric.deleteCredentials({ server: CREDENTIAL_SERVER }),
      CREDENTIAL_TIMEOUT_MS,
      "Could not reset old Face Unlock data.",
    );
  } catch {
    /* first enroll, or already empty */
  }
  await withTimeout(
    NativeBiometric.setCredentials({
      username: encodeUser(input.userId, input.email),
      password: input.refreshToken,
      server: CREDENTIAL_SERVER,
    }),
    CREDENTIAL_TIMEOUT_MS,
    "Could not save Face Unlock on this phone. Try again.",
  );
  const meta: FaceUnlockMeta = {
    enabled: true,
    userId: input.userId,
    email: input.email,
    biometryType: availability.biometryType,
    label,
  };
  await writeMeta(meta);
  await markPrompted();
  markFaceUnlockSessionActive();
  await persistRefreshPolicy(input.refreshToken, false);
  return meta;
}

export async function updateFaceUnlockRefresh(
  refreshToken: string,
): Promise<void> {
  const meta = await readMeta();
  if (!meta || !refreshToken) return;
  await withTimeout(
    NativeBiometric.setCredentials({
      username: encodeUser(meta.userId, meta.email),
      password: refreshToken,
      server: CREDENTIAL_SERVER,
    }),
    CREDENTIAL_TIMEOUT_MS,
    "Could not update Face Unlock credentials.",
  );
}

export async function disableFaceUnlock(): Promise<void> {
  if (!isNative()) {
    writeEnrolledFlag(false);
    return;
  }
  try {
    await NativeBiometric.deleteCredentials({ server: CREDENTIAL_SERVER });
  } catch {
    /* already gone */
  }
  await writeMeta(null);
  try {
    const { getRefreshToken } = await import("@/lib/api/client");
    const refresh = getRefreshToken();
    if (refresh) await persistRefreshPolicy(refresh, true);
  } catch {
    /* ignore */
  }
}

export async function authenticateFaceUnlock(): Promise<{
  userId: string;
  email: string;
  refreshToken: string;
}> {
  const meta = await readMeta();
  if (!meta) {
    throw new Error("Face Unlock is not enabled on this device.");
  }
  await verifyUnlock(meta.label);
  const creds = await withTimeout(
    NativeBiometric.getCredentials({
      server: CREDENTIAL_SERVER,
    }),
    CREDENTIAL_TIMEOUT_MS,
    "Could not read the saved Face Unlock session.",
  );
  const bound = decodeUser(creds.username);
  if (bound.userId !== meta.userId) {
    throw new Error("Face Unlock is tied to a different account on this phone.");
  }
  if (!creds.password) {
    throw new Error("No saved session. Sign in with your password.");
  }
  markFaceUnlockSessionActive();
  return {
    userId: bound.userId,
    email: bound.email,
    refreshToken: creds.password,
  };
}

/**
 * After a password sign-in: keep this process unlocked, and if Face Unlock is
 * already bound to the same account, refresh the Keystore copy without
 * leaving the token in Preferences.
 */
export async function applyFaceUnlockAfterPasswordLogin(input: {
  userId?: string;
  email?: string;
  refreshToken?: string;
}): Promise<void> {
  if (!isNative()) return;
  try {
    markFaceUnlockSessionActive();
    const meta = await readMeta();
    if (!meta || !input.refreshToken || !input.userId) return;
    if (input.userId !== meta.userId) return;
    await updateFaceUnlockRefresh(input.refreshToken);
    await persistRefreshPolicy(input.refreshToken, false);
  } catch {
    /* Password session still stands if Keystore update fails. */
  }
}

export async function hasSkippedFaceUnlockPrompt(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: PROMPTED_KEY });
    return value === "1";
  } catch {
    return false;
  }
}

export async function markPrompted(): Promise<void> {
  if (!isNative()) return;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: PROMPTED_KEY, value: "1" });
}

export async function shouldOfferFaceUnlockEnroll(): Promise<boolean> {
  if (!isNative()) return false;
  if (await isFaceUnlockEnabled()) return false;
  if (await hasSkippedFaceUnlockPrompt()) return false;
  const { available } = await getFaceUnlockAvailability();
  return available;
}
