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

/** Survives logout so cold start can skip silent session restore. */
export const FACE_UNLOCK_ENROLLED_STORAGE_KEY = "finos:face_unlock_enrolled";

export type FaceUnlockMeta = {
  enabled: true;
  userId: string;
  email: string;
  biometryType: number;
  label: string;
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

const ALLOWED_BIOMETRY_TYPES = [
  BiometryType.FINGERPRINT,
  BiometryType.FACE_AUTHENTICATION,
  BiometryType.TOUCH_ID,
  BiometryType.FACE_ID,
  BiometryType.IRIS_AUTHENTICATION,
  BiometryType.MULTIPLE,
];

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

async function readMeta(): Promise<FaceUnlockMeta | null> {
  if (!isNative()) {
    writeEnrolledFlag(false);
    return null;
  }
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: META_KEY });
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

export async function getFaceUnlockAvailability(): Promise<{
  available: boolean;
  biometryType: BiometryType;
  label: string;
}> {
  if (!isNative()) {
    return {
      available: false,
      biometryType: BiometryType.NONE,
      label: "Biometrics",
    };
  }
  try {
    const result = await NativeBiometric.isAvailable({ useFallback: false });
    return {
      available: Boolean(result.isAvailable),
      biometryType: result.biometryType,
      label: biometryLabel(result.biometryType),
    };
  } catch {
    return {
      available: false,
      biometryType: BiometryType.NONE,
      label: "Biometrics",
    };
  }
}

async function verifyUnlock(label: string): Promise<void> {
  await NativeBiometric.verifyIdentity({
    reason: `Unlock ${APP_NAME} with Face or fingerprint`,
    title: label,
    subtitle: APP_NAME,
    description: "Use Face Unlock or your fingerprint to continue.",
    negativeButtonText: "Cancel",
    maxAttempts: 5,
    useFallback: false,
    allowedBiometryTypes: ALLOWED_BIOMETRY_TYPES,
  });
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
  if (!availability.available) {
    throw new Error(
      "This phone has no Face Unlock or fingerprint enrolled. Add Face Unlock or a fingerprint in system settings first.",
    );
  }
  await verifyUnlock(availability.label);
  await NativeBiometric.setCredentials({
    username: encodeUser(input.userId, input.email),
    password: input.refreshToken,
    server: CREDENTIAL_SERVER,
  });
  const meta: FaceUnlockMeta = {
    enabled: true,
    userId: input.userId,
    email: input.email,
    biometryType: availability.biometryType,
    label: availability.label,
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
  await NativeBiometric.setCredentials({
    username: encodeUser(meta.userId, meta.email),
    password: refreshToken,
    server: CREDENTIAL_SERVER,
  });
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
  const creds = await NativeBiometric.getCredentials({
    server: CREDENTIAL_SERVER,
  });
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
