"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { generateOtp, resetPassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [inlineCode, setInlineCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await generateOtp(email);
      const code = result.recovery_code?.trim() || null;
      setInlineCode(code);
      if (code) {
        setOtp(code);
        showToast({
          title: "Recovery code ready",
          description:
            "Email delivery is unavailable on this server — use the code shown below.",
          tone: "warning",
        });
      } else {
        setOtp("");
        showToast({
          title: "Recovery code sent",
          description:
            result.message ||
            "If an account exists for this email, a code was sent.",
          tone: "success",
        });
      }
      setStep("reset");
    } catch (err) {
      showToast({
        title: "Could not send code",
        description: getErrorMessage(err, "Please try again in a moment."),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast({
        title: "Passwords do not match",
        description: "Please re-enter the same password in both fields.",
        tone: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      await resetPassword({
        email,
        otp: otp.trim(),
        newPassword,
        confirmNewPassword,
      });
      showToast({
        title: "Password updated",
        description: "You can sign in with your new password.",
        tone: "success",
      });
      router.push("/signin");
    } catch (err) {
      showToast({
        title: "Reset failed",
        description: getErrorMessage(err, "Could not reset password"),
        tone: "error",
      });
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
        {step === "email"
          ? "Enter your account email. We’ll send a one-time code when email is available."
          : inlineCode
            ? "Email delivery is offline on this server — use the recovery code below."
            : "Enter the 6-digit code from your email, then choose a new password."}
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
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={submitReset} className="space-y-4">
              <p className="text-xs text-[var(--ds-gray-700)]">
                Resetting password for{" "}
                <span className="font-medium text-[var(--ds-gray-1000)]">
                  {email}
                </span>
              </p>

              {inlineCode ? (
                <div className="rounded-[var(--ds-radius-2)] border border-[var(--ds-gray-400)] bg-[var(--ds-background-200)] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--ds-gray-800)]">
                    Your recovery code
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.35em] text-[var(--ds-gray-1000)]">
                    {inlineCode}
                  </p>
                  <p className="mt-2 text-xs text-[var(--ds-gray-700)]">
                    Expires in 10 minutes. It was filled in below for you.
                  </p>
                </div>
              ) : null}

              <div>
                <Label htmlFor="otp">6-digit recovery code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                />
                {!inlineCode ? (
                  <p className="mt-1.5 text-xs text-[var(--ds-gray-700)]">
                    Check your inbox for a 6-digit code — not your email address.
                    The code expires after 10 minutes.
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="new">New password</Label>
                <PasswordInput
                  id="new"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <PasswordInput
                  id="confirm"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter your password"
                />
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Update password
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setInlineCode(null);
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
              >
                Use a different email
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
