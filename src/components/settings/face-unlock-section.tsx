"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage, getRefreshToken } from "@/lib/api/client";
import { APP_NAME } from "@/lib/brand";
import { refreshClientPlatform } from "@/lib/runtime-platform";
import {
  disableFaceUnlock,
  enrollFaceUnlock,
  getFaceUnlockAvailability,
  getFaceUnlockMeta,
  isFaceUnlockCanceled,
  type FaceUnlockMeta,
} from "@/lib/native/face-unlock";

export function FaceUnlockSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [native, setNative] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [meta, setMeta] = useState<FaceUnlockMeta | null>(null);
  const [label, setLabel] = useState("Face Unlock");
  const [available, setAvailable] = useState(false);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [nextMeta, availability] = await Promise.all([
      getFaceUnlockMeta(),
      getFaceUnlockAvailability(),
    ]);
    setMeta(nextMeta);
    setAvailable(availability.available);
    setLabel(nextMeta?.label || availability.label);
    setHint(availability.hint);
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      refreshClientPlatform();
      const nativeNow = Capacitor.isNativePlatform();
      if (cancelled) return;
      setNative(nativeNow);
      setReady(true);
      if (!nativeNow) return;
      setChecking(true);
      try {
        await refresh();
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void boot();
    let listener: { remove: () => Promise<void> } | undefined;
    if (Capacitor.isNativePlatform()) {
      void NativeBiometric.addListener("biometryChange", () => {
        if (!cancelled) void refresh();
      }).then((handle) => {
        listener = handle;
      });
    }
    return () => {
      cancelled = true;
      void listener?.remove();
    };
  }, [user?.id]);

  async function checkAgain() {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  }

  async function enable() {
    if (!user?.id || !user.email) return;
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      showToast({
        title: "Sign in with your password first",
        description: "Biometrics need a saved session on this phone.",
        tone: "warning",
      });
      return;
    }
    setBusy(true);
    try {
      const next = await enrollFaceUnlock({
        userId: user.id,
        email: user.email,
        refreshToken,
      });
      setMeta(next);
      setAvailable(true);
      setLabel(next.label);
      showToast({
        title: `${next.label} is on`,
        description: `This device will ask for ${next.label.toLowerCase()} after you sign out or reopen the app.`,
        tone: "success",
      });
    } catch (error) {
      if (!isFaceUnlockCanceled(error)) {
        showToast({
          title: "Couldn’t enable Face Unlock",
          description: getErrorMessage(error, "Biometric enrollment failed."),
          tone: "error",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await disableFaceUnlock();
      setMeta(null);
      showToast({
        title: "Device unlock turned off",
        description: "This device will use email and password again.",
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "Couldn’t disable Face Unlock",
        description: getErrorMessage(error, "Try again."),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-semibold">
            Face or fingerprint
          </h2>
          <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
            Checking this device…
          </p>
        </CardHeader>
      </Card>
    );
  }

  if (!native) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-semibold">
            Face or fingerprint
          </h2>
          <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
            Face or fingerprint unlock is available in the {APP_NAME} Android
            app. It uses the phone’s Face Unlock or fingerprint — not your
            profile photo.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const enabled = Boolean(meta);
  const blocked = busy || checking;

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-semibold">
          Face or fingerprint on this device
        </h2>
        <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
          {APP_NAME} asks your phone to confirm it is you, then restores this
          account. Nothing is stored as a face photo.
        </p>
      </CardHeader>
      <CardBody className="space-y-3">
        {checking ? (
          <p className="flex items-center gap-2 text-xs leading-5 text-[var(--ds-gray-700)]">
            <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            Checking Face Unlock and fingerprint on this phone…
          </p>
        ) : null}

        <Checkbox
          id="face-unlock-toggle"
          checked={enabled}
          disabled={blocked}
          onChange={(checked) => {
            if (checked) void enable();
            else void disable();
          }}
          label="Use Face Unlock or fingerprint to sign in"
          description={
            enabled
              ? `Enabled for ${meta?.email} (${label})`
              : available
                ? hint ||
                  "The phone can use Face Unlock or a fingerprint — whichever it offers."
                : hint ||
                  "Tap Enable to try, or Check again after adding Face Unlock in Android Settings."
          }
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={checking}
            disabled={blocked}
            onClick={() => void checkAgain()}
          >
            Check again
          </Button>
          {enabled ? (
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              disabled={checking}
              onClick={() => void disable()}
            >
              Disable
            </Button>
          ) : (
            <Button
              size="sm"
              loading={busy}
              disabled={checking}
              onClick={() => void enable()}
            >
              Enable
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
