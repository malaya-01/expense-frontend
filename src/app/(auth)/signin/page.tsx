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
import { faceLoginAvailable, loginWithFace } from "@/lib/api/face-login";
import { getCurrentUser } from "@/lib/api/user";
import {
  getErrorMessage,
  getAccessToken,
  getLockUntil,
} from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { useGlobalLoader } from "@/components/brand/global-loader";
import { userIdFromToken } from "@/lib/jwt";
import { FaceCameraDialog } from "@/components/auth/face-camera-dialog";

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
  const [faceAvailable, setFaceAvailable] = useState(false);
  const sessionToastShown = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setHasSession(Boolean(getAccessToken()));
    void faceLoginAvailable()
      .then((status) => {
        if (!cancelled) setFaceAvailable(Boolean(status.enabled));
      })
      .catch(() => {
        if (!cancelled) setFaceAvailable(false);
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

  async function onFaceVerified(descriptor: number[]) {
    setCameraOpen(false);
    setFaceLoading(true);
    showPageLoader("Signing in");
    try {
      const tokens = await loginWithFace(descriptor);
      const user = await getCurrentUser();
      await setSession({
        ...user,
        id: user.id || tokens.user?.id || "",
      });
      showToast({
        title: "Signed in",
        description: `Welcome back${user.full_name ? `, ${user.full_name}` : ""}.`,
        tone: "success",
      });
      router.replace("/dashboard");
    } catch (err) {
      const message = getErrorMessage(err, "Face not recognized");
      const lockedUntil = getLockUntil(err);
      showToast({
        title: "Face login failed",
        description: message.includes("EMAIL_NOT_VERIFIED")
          ? "Verify your email, then try face login again."
          : message,
        tone: "error",
        duration: lockedUntil ? 12_000 : undefined,
        lockedUntil: lockedUntil ?? undefined,
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
          {faceAvailable ? (
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
                Uses the face saved on your account. Password sign-in still
                works.
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
        onClose={() => setCameraOpen(false)}
        onVerified={(descriptor) => void onFaceVerified(descriptor)}
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
