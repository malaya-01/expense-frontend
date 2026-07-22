"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { loginUser } from "@/lib/api/auth";
import { getErrorMessage, getAccessToken } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { userIdFromToken } from "@/lib/jwt";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const sessionToastShown = useRef(false);

  useEffect(() => {
    setHasSession(Boolean(getAccessToken()));
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
    try {
      const tokens = await loginUser({ email, password });
      const id =
        tokens.user?.id || userIdFromToken(tokens.accessToken) || "local";
      setSession({
        id,
        email: tokens.user?.email || email,
        full_name: tokens.user?.full_name ?? null,
        country: tokens.user?.country ?? null,
        currency: tokens.user?.currency || "USD",
        timezone: tokens.user?.timezone,
        locale: tokens.user?.locale,
        avatar_url: tokens.user?.avatar_url ?? null,
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
      showToast({
        title: "Sign in failed",
        description: message,
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-[28px] leading-9 tracking-[-1.12px] sm:text-[32px] sm:leading-10 sm:tracking-[-1.28px]">
        Sign in to FinOS
      </h3>
      <p className="mb-8 text-sm leading-5 text-[var(--ds-gray-900)]">
        Your Personal Financial Operating System.
      </p>

      <Card>
        <CardBody className="pt-6">
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

            <Button type="submit" className="w-full" loading={loading}>
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
