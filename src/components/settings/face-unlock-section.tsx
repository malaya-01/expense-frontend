"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage, getRefreshToken } from "@/lib/api/client";
import { APP_NAME } from "@/lib/brand";
import { isNativeClient } from "@/lib/runtime-platform";
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
  const [meta, setMeta] = useState<FaceUnlockMeta | null>(null);
  const [label, setLabel] = useState("Face Unlock");
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [nextMeta, availability] = await Promise.all([
      getFaceUnlockMeta(),
      getFaceUnlockAvailability(),
    ]);
    setMeta(nextMeta);
    setAvailable(availability.available);
    setLabel(nextMeta?.label || availability.label);
  }

  useEffect(() => {
    setNative(isNativeClient());
    setReady(true);
    void refresh();
  }, [user?.id]);

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

  if (!ready) return null;

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
        {!available && !meta ? (
          <p className="text-xs leading-5 text-[var(--ds-gray-700)]">
            This phone has no Face Unlock or fingerprint enrolled. Add one in
            Android settings first.
          </p>
        ) : (
          <Checkbox
            id="face-unlock-toggle"
            checked={Boolean(meta)}
            disabled={busy || (!available && !meta)}
            onChange={(checked) => {
              if (checked) void enable();
              else void disable();
            }}
            label="Use Face Unlock or fingerprint to sign in"
            description={
              meta
                ? `Enabled for ${meta.email} (${label})`
                : "The phone can use Face Unlock or a fingerprint — whichever it offers."
            }
          />
        )}
        {meta ? (
          <div className="flex justify-end">
            <Button variant="danger" size="sm" loading={busy} onClick={() => void disable()}>
              Disable
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
