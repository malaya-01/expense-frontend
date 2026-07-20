"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody } from "@/components/ui/card";
import { loginUser } from "@/lib/api/auth";
import { getErrorMessage, getAccessToken } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { userIdFromToken } from "@/lib/jwt";

export default function SignInPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
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
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Invalid email or password"));
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
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
            ) : null}

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
      {getAccessToken() ? (
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
