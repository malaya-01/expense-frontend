"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { loginUser } from "@/lib/api/auth";
import { getCurrentUser } from "@/lib/api/user";
import {
  getErrorMessage,
  getAccessToken,
  getLockUntil,
  restoreSessionFromRefreshToken,
} from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { useGlobalLoader } from "@/components/brand/global-loader";
import { userIdFromToken } from "@/lib/jwt";
import { FaceCameraDialog } from "@/components/auth/face-camera-dialog";
import {
  clearFaceLoginProfile,
  hydrateFaceLoginProfile,
  readFaceLoginProfileSync,
  type FaceLoginProfile,
} from "@/lib/face-login/profile";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const { showToast } = useToast();
  const { show: showPageLoader } = useGlobalLoader();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [faceProfile, setFaceProfile] = useState<FaceLoginProfile | null>(null);
  const sessionToastShown = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateFaceLoginProfile().then(() => {
      if (cancelled) return;
      setHasSession(Boolean(getAccessToken()));
      const profile = readFaceLoginProfileSync();
      setFaceProfile(profile);
      if (profile?.email) {
        setEmail((current) => current || profile.email);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionToastShown.current) return;
    if (searchParams.get("session") !== "expired") return;
    sessionToastShown.current = true;
    showToast({
      title: "Session expired",
      description: "Please sign in again to continue.",
      tone: "warning",
    });
  }, [searchParams, showToast]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    showPageLoader("Signing in");
    try {
      const tokens = await loginUser({ email, password });
      const id = tokens.user?.id || userIdFromToken(tokens.accessToken);
      if (!id) {
        throw new Error("Sign-in succeeded but no user id was returned.");
      }
      await setSession({
        id,
        email: tokens.user?.email || email,
        full_name: tokens.user?.full_name ?? null,
        country: tokens.user?.country ?? null,
        currency: tokens.user?.currency || "USD",
        timezone: tokens.user?.timezone,
        locale: tokens.user?.locale,
        avatar_url: tokens.user?.avatar_url ?? null,
        is_admin: tokens.user?.is_admin ?? false,
        permissions: tokens.user?.permissions ?? [],
      });
      showToast({
        title: "Signed in",
        description: `Welcome back${tokens.user?.full_name ? `, ${tokens.user.full_name}` : ""}.`,
        tone: "success",
      });
      router.replace("/dashboard");
    } catch (err) {
      const message = getErrorMessage(err, "Invalid email or password");
      if (message.includes("EMAIL_NOT_VERIFIED")) {
        showToast({
          title: "Email not verified",
          description:
            "We sent a fresh verification link. Check your inbox, then sign in.",
          tone: "warning",
        });
        router.replace(`/check-email?email=${encodeURIComponent(email)}`);
        return;
      }
      const lockedUntil = getLockUntil(err);
      showToast({
        title: "Sign in failed",
        description: message,
        tone: "error",
        duration: lockedUntil ? 12_000 : undefined,
        lockedUntil: lockedUntil ?? undefined,
      });
    } finally {
      setLoading(false);
      showPageLoader(null);
    }
  }

  async function onFaceVerified() {
    const profile = readFaceLoginProfileSync();
    if (!profile) return;
    setCameraOpen(false);
    setFaceLoading(true);
    showPageLoader("Signing in");
    try {
      await restoreSessionFromRefreshToken(profile.refreshToken);
      const user = await getCurrentUser();
      if (user.id !== profile.userId) {
        await clearFaceLoginProfile();
        setFaceProfile(null);
        throw new Error("Face login is tied to a different account on this device.");
      }
      await setSession(user);
      showToast({
        title: "Signed in",
        description: `Welcome back${user.full_name ? `, ${user.full_name}` : ""}.`,
        tone: "success",
      });
      router.replace("/dashboard");
    } catch (err) {
      const message = getErrorMessage(err, "Face login failed");
      const expired =
        message.toLowerCase().includes("refresh") ||
        message.toLowerCase().includes("session") ||
        (typeof err === "object" &&
          err !== null &&
          "response" in err &&
          (err as { response?: { status?: number } }).response?.status === 401);
      if (expired) {
        await clearFaceLoginProfile();
        setFaceProfile(null);
        showToast({
          title: "Saved session expired",
          description: "Sign in with your password, then turn face login on again in Settings.",
          tone: "warning",
        });
        return;
      }
      showToast({
        title: "Face login failed",
        description: message,
        tone: "error",
      });
    } finally {
      setFaceLoading(false);
      showPageLoader(null);
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-[28px] leading-9 tracking-[-1.12px] sm:text-[32px] sm:leading-10 sm:tracking-[-1.28px]">
        Sign in to {APP_NAME}
      </h3>
      <p className="mb-8 text-sm leading-5 text-[var(--ds-gray-900)]">
        {APP_TAGLINE}
      </p>

      <Card>
        <CardBody className="pt-6">
          {faceProfile ? (
            <div className="mb-6 space-y-3">
              <Button
                type="button"
                className="w-full"
                loading={faceLoading}
                disabled={loading}
                onClick={() => setCameraOpen(true)}
              >
                <ScanFace size={18} aria-hidden />
                Sign in with face
              </Button>
              <p className="text-center text-xs text-[var(--ds-gray-700)]">
                Saved for {faceProfile.email}. Use your password if this is a
                different account.
              </p>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
                <span className="h-px flex-1 bg-[var(--ds-gray-200)]" />
                or password
                <span className="h-px flex-1 bg-[var(--ds-gray-200)]" />
              </div>
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="password" className="mb-0">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--ds-focus-color)]"
                >
                  Forgot?
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || faceLoading}>
              Continue
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--ds-gray-900)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[var(--ds-focus-color)]">
          Sign up
        </Link>
      </p>
      <FaceCameraDialog
        open={cameraOpen}
        mode="verify"
        savedDescriptor={faceProfile?.descriptor}
        onClose={() => setCameraOpen(false)}
        onVerified={() => void onFaceVerified()}
      />
      {hasSession ? (
        <p className="mt-3 text-center text-xs text-[var(--ds-gray-700)]">
          Session detected —{" "}
          <button
            type="button"
            className="text-[var(--ds-focus-color)]"
            onClick={() => router.replace("/dashboard")}
          >
            go to dashboard
          </button>
        </p>
      ) : null}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
