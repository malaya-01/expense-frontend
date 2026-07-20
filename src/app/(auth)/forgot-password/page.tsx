"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody } from "@/components/ui/card";
import { generateOtp, resetPassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await generateOtp(email);
      if (result.otp) setDevOtp(result.otp);
      setMessage("OTP sent. Check your email (or console in development).");
      setStep("reset");
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate OTP"));
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({
        email,
        otp,
        newPassword,
        confirmNewPassword,
      });
      setMessage("Password updated. You can log in now.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not reset password"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-[28px] leading-9 tracking-[-1.12px] sm:text-[32px] sm:leading-10 sm:tracking-[-1.28px]">
        Reset password
      </h3>
      <p className="mb-8 text-sm leading-5 text-[var(--ds-gray-900)]">
        We&apos;ll send a one-time code to your email.
      </p>

      <Card>
        <CardBody className="pt-6">
          {step === "email" ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error ? (
                <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" loading={loading}>
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={submitReset} className="space-y-4">
              <div>
                <Label htmlFor="otp">OTP code</Label>
                <Input
                  id="otp"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                />
                {devOtp ? (
                  <p className="mt-1.5 text-xs text-[var(--ds-gray-700)]">
                    Dev OTP: {devOtp}
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="new">New password</Label>
                <Input
                  id="new"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              {error ? (
                <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
              ) : null}
              {message ? (
                <p className="text-sm text-[var(--ds-status-green-dark)]">{message}</p>
              ) : null}
              <Button type="submit" className="w-full" loading={loading}>
                Update password
              </Button>
            </form>
          )}
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--ds-gray-900)]">
        <Link href="/signin" className="text-[var(--ds-focus-color)]">
          Back to login
        </Link>
      </p>
    </div>
  );
}
