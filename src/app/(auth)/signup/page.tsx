"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { loginUser, registerUser } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { userIdFromToken } from "@/lib/jwt";
import { APP_NAME } from "@/lib/brand";
import { COUNTRIES, SUPPORTED_CURRENCIES, getCountry } from "@/lib/currency/currency.data";

export default function SignUpPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("IN");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);

  const sortedCountries = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  function onCountryChange(code: string) {
    setCountry(code);
    const meta = getCountry(code);
    if (meta) setCurrency(meta.currency);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast({
        title: "Passwords do not match",
        description: "Please re-enter the same password in both fields.",
        tone: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      await registerUser({
        full_name: fullName,
        email,
        password,
        confirmPassword,
        country,
        currency,
      });
      const tokens = await loginUser({ email, password });
      const id =
        tokens.user?.id || userIdFromToken(tokens.accessToken) || "local";
      await setSession({
        id,
        email: tokens.user?.email || email,
        full_name: tokens.user?.full_name ?? fullName,
        country: tokens.user?.country ?? country,
        currency: tokens.user?.currency || currency || "USD",
        timezone: tokens.user?.timezone,
        locale: tokens.user?.locale,
        avatar_url: tokens.user?.avatar_url ?? null,
        is_admin: tokens.user?.is_admin ?? false,
        permissions: tokens.user?.permissions ?? [],
      });
      showToast({
        title: `Welcome to ${APP_NAME}`,
        description: "Your account is ready.",
        tone: "success",
      });
      router.replace("/dashboard");
    } catch (err) {
      showToast({
        title: "Sign up failed",
        description: getErrorMessage(err, "Could not create account"),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 font-heading text-[28px] leading-9 tracking-[-1.12px] sm:text-[32px] sm:leading-10 sm:tracking-[-1.28px]">
        Create {APP_NAME} account
      </h3>
      <p className="mb-8 text-sm leading-5 text-[var(--ds-gray-900)]">
        Tell us where you are so totals use your currency.
      </p>

      <Card>
        <CardBody className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="sm:col-span-1">
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  id="country"
                  required
                  value={country}
                  onChange={(e) => onCountryChange(e.target.value)}
                >
                  {sortedCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Base currency</Label>
                <Select
                  id="currency"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
                  Net worth and reports use this currency.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <PasswordInput
                  id="confirm"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--ds-gray-900)]">
        Already have an account?{" "}
        <Link href="/signin" className="text-[var(--ds-focus-color)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
