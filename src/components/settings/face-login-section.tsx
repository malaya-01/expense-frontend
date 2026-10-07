"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/client";
import {
  deleteFaceLogin,
  getFaceLoginStatus,
  saveFaceLogin,
} from "@/lib/api/face-login";
import { APP_NAME } from "@/lib/brand";
import { FaceCameraDialog } from "@/components/auth/face-camera-dialog";
import {
  clearFaceLoginProfile,
  readFaceLoginProfileSync,
} from "@/lib/face-login/profile";

export function FaceLoginSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await getFaceLoginStatus();
        if (cancelled) return;
        if (!status.enabled) {
          const local = readFaceLoginProfileSync();
          if (local && user?.id && local.userId === user.id && local.descriptor?.length) {
            const moved = await saveFaceLogin(local.descriptor);
            if (!cancelled) {
              setEnabled(moved.enabled);
              setEmail(moved.email);
            }
          }
        } else {
          setEnabled(true);
          setEmail(status.email);
        }
        await clearFaceLoginProfile();
      } catch {
        if (!cancelled) {
          setEnabled(false);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const enrolledForUser = enabled;

  function beginEnroll() {
    if (!user?.id || !user.email) return;
    setCameraOpen(true);
  }

  async function disable() {
    setBusy(true);
    try {
      await deleteFaceLogin();
      await clearFaceLoginProfile();
      setEnabled(false);
      setEmail(null);
      showToast({
        title: "Face login turned off",
        description: "Password sign-in still works on the web and the phone.",
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "Couldn’t turn off face login",
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
          <h2 className="font-heading text-base font-semibold">Face login</h2>
          <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
            Checking this device…
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-semibold">Face login</h2>
          <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
            Set this up once on the web or the phone. The face template is
            encrypted with your account, so the other one can use it too.
            Closing the app does not sign you out.
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <Checkbox
            id="face-login-toggle"
            checked={enrolledForUser}
            disabled={busy}
            onChange={(checked) => {
              if (checked) beginEnroll();
              else void disable();
            }}
            label="Sign in with face"
            description={
              enrolledForUser
                ? `Saved for ${email || user?.email || "this account"}. Password sign-in still works.`
                : "Turn this on to capture your face. It is encrypted and stored with your account, not only on this device."
            }
          />

          <div className="flex flex-wrap justify-end gap-2">
            {enrolledForUser ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={beginEnroll}
                >
                  Replace face
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={busy}
                  onClick={() => void disable()}
                >
                  Turn off
                </Button>
              </>
            ) : (
              <Button size="sm" disabled={busy} onClick={beginEnroll}>
                Set up face login
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <FaceCameraDialog
        open={cameraOpen}
        mode="enroll"
        onClose={() => setCameraOpen(false)}
        onEnrolled={async (result) => {
          try {
            const saved = await saveFaceLogin(result.descriptor, result.preview);
            await clearFaceLoginProfile();
            setEnabled(saved.enabled);
            setEmail(saved.email);
            setCameraOpen(false);
            showToast({
              title: saved.stored_in_r2 ? "Face login is on" : "Face saved, photo not uploaded",
              description: saved.stored_in_r2
                ? "The encrypted face data and enrollment photo are in Cloudflare R2. You stay signed in when you leave the app."
                : "Sign-in was saved on the server, but this API has no Cloudflare R2 keys, so nothing was written to the bucket.",
              tone: saved.stored_in_r2 ? "success" : "warning",
            });
          } catch (error) {
            throw new Error(getErrorMessage(error, "Could not save face login."));
          }
        }}
      />
    </>
  );
}
