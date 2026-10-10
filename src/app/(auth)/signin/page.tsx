"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardBody } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { getActiveSessions, loginUser, type OtherLogin } from "@/lib/api/auth";
import { formatDateTime } from "@/lib/format";
import {
  getErrorMessage,
  getAccessToken,
  getLockUntil,
  SESSION_EXPIRED_FLAG_KEY,
} from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { useGlobalLoader } from "@/components/brand/global-loader";
import { userIdFromToken } from "@/lib/jwt";
import type { AuthTokens, User } from "@/types";

function sessionLabel(ua: string | null): { label: string; phone: boolean } {
  const raw = ua || "";
  const tag = raw.match(/^\[opal:([^\]]+)\]/)?.[1] || "";
  const lower = raw.toLowerCase();
  const os = /android/.test(lower)
    ? "Android"
    : /iphone|ipad|ipod/.test(lower)
      ? "iOS"
      : /windows/.test(lower)
        ? "Windows"
        : /mac os x|macintosh/.test(lower)
          ? "macOS"
          : /linux/.test(lower)
            ? "Linux"
            : "";
  const phone =
    tag.startsWith("native") || /mobile|phone/.test(tag) || /mobile/.test(lower);
  if (tag.startsWith("native")) {
    return { label: os ? `Opal app on ${os}` : "Opal app", phone: true };
  }
  const browser = /edg\//.test(lower)
    ? "Edge"
    : /firefox\//.test(lower)
      ? "Firefox"
      : /chrome\//.test(lower)
        ? "Chrome"
        : /safari\//.test(lower)
          ? "Safari"
          : "";
  return {
    label: browser
      ? `${browser}${os ? ` on ${os}` : ""}`
      : os || "Another device",
    phone,
  };
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const { showToast } = useToast();
  const { show: showPageLoader } = useGlobalLoader();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [otherSessions, setOtherSessions] = useState<OtherLogin[] | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const sessionToastShown = useRef(false);

  useEffect(() => {
    setHasSession(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    if (sessionToastShown.current) return;
    // Android full-page loads drop the query string, so the API client also
    // leaves a sessionStorage flag.
    let flag: string | null = null;
    try {
      flag = sessionStorage.getItem(SESSION_EXPIRED_FLAG_KEY);
      sessionStorage.removeItem(SESSION_EXPIRED_FLAG_KEY);
    } catch {
      flag = null;
    }
    const reason = searchParams.get("session");
    if (reason === "replaced" || flag === "replaced") {
      sessionToastShown.current = true;
      showToast({
        title: "Signed in on another device",
        description:
          "Opal stays signed in on one device at a time, so this one was signed out. Anything you saved here that hadn't synced is kept and uploads when you sign in again.",
        tone: "warning",
        duration: 12000,
      });
      return;
    }
    if (reason !== "expired" && flag !== "1") return;
    sessionToastShown.current = true;
    showToast({
      title: "Session expired",
      description: "Please sign in again to continue.",
      tone: "warning",
    });
  }, [searchParams, showToast]);

  async function finishSignIn(tokens: AuthTokens & { user?: User }) {
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
  }

  async function attemptSignIn(action?: {
    replaceOtherSessions?: boolean;
    revokeSessionId?: string;
  }) {
    const replaceOtherSessions = Boolean(action?.replaceOtherSessions);
    const revokeSessionId = action?.revokeSessionId;
    if (revokeSessionId) setRevokingId(revokeSessionId);
    else setLoading(true);
    if (!revokeSessionId) {
      showPageLoader(
        replaceOtherSessions ? "Signing out other devices" : "Signing in",
      );
    }
    try {
      const tokens = await loginUser({
        email,
        password,
        replaceOtherSessions,
        revokeSessionId,
      });
      setOtherSessions(null);
      setConfirmOthers(false);
      await finishSignIn(tokens);
    } catch (err) {
      const sessions = getActiveSessions(err);
      if (sessions) {
        setOtherSessions(sessions);
        if (revokeSessionId) {
          showToast({
            title: "Session signed out",
            description: "That device will be asked to sign in again.",
            tone: "success",
          });
        }
        return;
      }
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
        description: message.replace(/^ACTIVE_SESSION:\s*/, ""),
        tone: "error",
        duration: lockedUntil ? 12_000 : undefined,
        lockedUntil: lockedUntil ?? undefined,
      });
    } finally {
      setRevokingId(null);
      setLoading(false);
      showPageLoader(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await attemptSignIn();
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

            <Button type="submit" className="w-full" disabled={loading || Boolean(revokingId)}>
              Continue
            </Button>
          </form>
          {otherSessions ? (
            <div className="mt-6 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)] pt-5">
              <h4 className="text-[13px] font-medium text-[var(--ds-gray-1000)]">
                Where you&apos;re signed in
              </h4>
              <p className="mt-1 text-[12px] leading-5 text-[var(--ds-gray-700)]">
                This account is open on another device. Sign that device out to
                continue on this screen.
              </p>
              {otherSessions.length > 0 ? (
                <ul className="mt-3 divide-y divide-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)]">
                  {otherSessions.map((session) => {
                    const info = sessionLabel(session.user_agent);
                    const when = session.last_used_at || session.created_at;
                    const Icon = info.phone ? Smartphone : Monitor;
                    return (
                      <li
                        key={session.id}
                        className="flex items-center gap-3 py-3"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ds-background-200)] text-[var(--ds-gray-900)]">
                          <Icon size={18} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[var(--ds-gray-1000)]">
                            {info.label}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-4 text-[var(--ds-gray-700)]">
                            {when
                              ? `Last active ${formatDateTime(when)}`
                              : "Still signed in"}
                          </span>
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={revokingId === session.id}
                          disabled={loading || (revokingId !== null && revokingId !== session.id)}
                          onClick={() =>
                            void attemptSignIn({ revokeSessionId: session.id })
                          }
                          aria-label={`Sign out ${info.label}`}
                        >
                          Sign out
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <p className="min-w-0 text-[12px] leading-5 text-[var(--ds-gray-700)]">
                  Lost a phone or used a shared computer? End every open session,
                  then continue on this screen.
                </p>
                <Button
                  variant="danger"
                  disabled={loading || revokingId !== null || otherSessions.length === 0}
                  onClick={() => setConfirmOthers(true)}
                >
                  Sign out other devices
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--ds-gray-900)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[var(--ds-focus-color)]">
          Sign up
        </Link>
      </p>
      <ConfirmDialog
        open={confirmOthers}
        title="Sign out other devices?"
        description={
          otherSessions
            ? `This ends ${otherSessions.length} other ${otherSessions.length === 1 ? "session" : "sessions"}. Those devices will need your password to sign in again. This screen will then sign in.`
            : undefined
        }
        confirmLabel="Sign out others"
        destructive
        busy={loading}
        onClose={() => {
          if (!loading) setConfirmOthers(false);
        }}
        onConfirm={() => void attemptSignIn({ replaceOtherSessions: true })}
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
