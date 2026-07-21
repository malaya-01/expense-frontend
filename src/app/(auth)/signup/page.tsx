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
      const user = await registerUser({
        full_name: fullName,
        email,
        password,
        confirmPassword,
        country,
        currency,
      });
      showToast({
        title: "Account created",
        description: "Signing you in…",
        tone: "success",
      });
      const tokens = await loginUser({ email, password });
      const id = user.id || userIdFromToken(tokens.accessToken) || "local";
      setSession({
        id,
        email: user.email || email,
        full_name: user.full_name || fullName,
        country: user.country || country,
        currency: user.currency || currency,
      });
      showToast({
        title: "Welcome to FinOS",
        description: "Your personal financial operating system is ready.",
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
      <h3 className="mb-2 text-[28px] leading-9 tracking-[-1.12px] sm:text-[32px] sm:leading-10 sm:tracking-[-1.28px]">
        Create FinOS account
      </h3>
      <p className="mb-8 text-sm leading-5 text-[var(--ds-gray-900)]">
        Tell us where you are so totals use your currency.
      </p>

      <Card>
        <CardBody className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
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
              />
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
