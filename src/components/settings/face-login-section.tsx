"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage, getRefreshToken } from "@/lib/api/client";
import { APP_NAME } from "@/lib/brand";
import { FaceCameraDialog } from "@/components/auth/face-camera-dialog";
import {
  clearFaceLoginProfile,
  hydrateFaceLoginProfile,
  readFaceLoginProfileSync,
  writeFaceLoginProfile,
  type FaceLoginProfile,
} from "@/lib/face-login/profile";

export function FaceLoginSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<FaceLoginProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateFaceLoginProfile().then(() => {
      if (cancelled) return;
      const saved = readFaceLoginProfileSync();
      setProfile(saved && (!user?.id || saved.userId === user.id) ? saved : null);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const enrolledForUser = Boolean(profile && user?.id && profile.userId === user.id);

  function beginEnroll() {
    if (!user?.id || !user.email) return;
    if (!getRefreshToken()) {
      showToast({
        title: "Sign in again first",
        description: "Face login needs an active session on this device.",
        tone: "warning",
      });
      return;
    }
    setCameraOpen(true);
  }

  async function disable() {
    setBusy(true);
    try {
      await clearFaceLoginProfile();
      setProfile(null);
      showToast({
        title: "Face login turned off",
        description: "This device will use email and password again.",
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
            Use the camera to sign in to {APP_NAME} on this browser or phone.
            Closing the app does not sign you out. Face login is only asked
            after you tap Log out.
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
                ? `Saved for ${profile?.email}. Password sign-in still works.`
                : "Turn this on to capture your face with the camera. A clear photo is kept on this device."
            }
          />

          {enrolledForUser && profile?.preview ? (
            <img
              src={profile.preview}
              alt=""
              className="size-16 rounded-full object-cover"
            />
          ) : null}

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
        onEnrolled={(result) => {
          if (!user?.id || !user.email) return;
          const refreshToken = getRefreshToken();
          if (!refreshToken) {
            setCameraOpen(false);
            showToast({
              title: "Couldn’t save face login",
              description: "Sign in again, then set it up from Settings.",
              tone: "warning",
            });
            return;
          }
          const next: FaceLoginProfile = {
            userId: user.id,
            email: user.email,
            descriptor: result.descriptor,
            preview: result.preview,
            refreshToken,
            enrolledAt: new Date().toISOString(),
          };
          setCameraOpen(false);
          void writeFaceLoginProfile(next)
            .then(() => {
              setProfile(next);
              showToast({
                title: "Face login is on",
                description:
                  "You stay signed in when you leave the app. After you log out, you can sign in with your face.",
                tone: "success",
              });
            })
            .catch((error) => {
              showToast({
                title: "Couldn’t save face login",
                description: getErrorMessage(error, "Try again."),
                tone: "error",
              });
            });
        }}
      />
    </>
  );
}
