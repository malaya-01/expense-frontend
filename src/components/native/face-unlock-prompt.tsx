"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { getRefreshToken, getErrorMessage } from "@/lib/api/client";
import {
  enrollFaceUnlock,
  isFaceUnlockCanceled,
  markPrompted,
  shouldOfferFaceUnlockEnroll,
  getFaceUnlockAvailability,
} from "@/lib/native/face-unlock";
import { FaceUnlockIcon } from "@/components/native/face-unlock-signin";

export function FaceUnlockPrompt() {
  const { user, isAuthenticated, ready } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Face Unlock");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !isAuthenticated || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const offer = await shouldOfferFaceUnlockEnroll();
      if (cancelled || !offer || !getRefreshToken()) return;
      const availability = await getFaceUnlockAvailability();
      if (cancelled) return;
      setLabel(availability.label);
      setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, user?.id]);

  async function skip() {
    setOpen(false);
    await markPrompted();
  }

  async function enable() {
    if (!user?.id || !user.email) return;
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      showToast({
        title: "Couldn’t enable Face Unlock",
        description: "Sign in with your password, then try again in Settings.",
        tone: "warning",
      });
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      const meta = await enrollFaceUnlock({
        userId: user.id,
        email: user.email,
        refreshToken,
      });
      setOpen(false);
      showToast({
        title: `${meta.label} is on`,
        description: `Next time, unlock this phone to open Opal as ${user.email}.`,
        tone: "success",
      });
    } catch (error) {
      if (isFaceUnlockCanceled(error)) {
        setBusy(false);
        return;
      }
      showToast({
        title: "Couldn’t enable Face Unlock",
        description: getErrorMessage(
          error,
          "The phone could not confirm it was you. You can try again in Settings → Security.",
        ),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => void skip()}
      title="Use Face or fingerprint next time?"
      footer={
        <>
          <Button variant="ghost" onClick={() => void skip()} disabled={busy}>
            Skip
          </Button>
          <Button onClick={() => void enable()} loading={busy}>
            <FaceUnlockIcon label={label} />
            Enable Face or fingerprint
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-[var(--ds-gray-900)]">
        Opal will ask your phone to confirm it is you with Face Unlock or
        fingerprint, then restore this session. Your profile photo is never
        used. You can turn this off in Settings → Security.
      </p>
    </Modal>
  );
}
