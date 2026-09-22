"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardBody } from "@/components/ui/card";
import { OtpInput } from "@/components/ui/otp-input";
import { useToast } from "@/components/ui/toast";
import {
  generateOtp,
  resetPassword,
  verifyRecoveryOtp,
} from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [inlineCode, setInlineCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyInlineCode() {
    if (!inlineCode) return;
    try {
      await navigator.clipboard.writeText(inlineCode);
      setCopied(true);
      setOtp(inlineCode);
      showToast({
        title: "Code copied",
        description: "Filled into the boxes — tap Verify code.",
        tone: "success",
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({
        title: "Could not copy",
        description: "Select the code and copy it manually.",
        tone: "warning",
      });
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (digits.length !== 6) {
        showToast({
          title: "No 6-digit code found",
          description: "Copy the code from your email, then try Paste again.",
          tone: "warning",
        });
        return;
      }
      setOtp(digits);
      showToast({
        title: "Code pasted",
        description: "Review the digits, then verify.",
        tone: "success",
      });
    } catch {
      showToast({
        title: "Paste blocked",
        description:
          "Allow clipboard access, or paste with Ctrl/Cmd+V on a digit box.",
        tone: "warning",
      });
    }
  }

  function goToEmail() {
    setStep("email");
    setOtp("");
    setResetToken("");
    setInlineCode(null);
    setNewPassword("");
    setConfirmNewPassword("");
  }

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await generateOtp(email);
      const code = result.recovery_code?.trim() || null;
      setInlineCode(code);
      setOtp("");
      setResetToken("");
      if (code) {
        showToast({
          title: "Recovery code ready",
          description:
            "Email delivery is unavailable on this server — use the code shown below.",
          tone: "warning",
        });
      } else {
        showToast({
          title: "Recovery code sent",
          description:
            result.message ||
            "If an account exists for this email, a code was sent.",
          tone: "success",
        });
      }
      setStep("otp");
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

  async function submitOtp(e: FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      showToast({
        title: "Enter the full code",
        description: "The recovery code is 6 digits.",
        tone: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      const result = await verifyRecoveryOtp({
        email,
        otp,
      });
      setResetToken(result.reset_token);
      showToast({
        title: "Code verified",
        description: "Choose a new password for your account.",
        tone: "success",
      });
      setStep("password");
    } catch (err) {
      showToast({
        title: "Invalid code",
        description: getErrorMessage(err, "Check the 6-digit code and try again."),
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
    if (!resetToken) {
      showToast({
        title: "Verify your code first",
        description: "Enter the recovery code before setting a new password.",
        tone: "warning",
      });
      setStep("otp");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({
        email,
        resetToken,
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

  async function resendCode() {
    setLoading(true);
    try {
      const result = await generateOtp(email);
      const code = result.recovery_code?.trim() || null;
      setInlineCode(code);
      setOtp("");
      setResetToken("");
      showToast({
        title: code ? "Recovery code ready" : "Code resent",
        description: code
          ? "Use the on-screen code below."
          : "Check your inbox for a new 6-digit code.",
        tone: code ? "warning" : "success",
      });
    } catch (err) {
      showToast({
        title: "Could not resend",
        description: getErrorMessage(err, "Please try again in a moment."),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  const subtitle =
    step === "email"
      ? "Enter your account email. We’ll send a one-time code when email is available."
      : step === "otp"
        ? inlineCode
          ? "Email delivery is offline on this server — enter the recovery code below."
          : "Enter the 6-digit code we sent to your email."
        : "Create a new password for your Opal account.";

  return (
    <div>
      <h3 className="mb-2 text-[28px] leading-9 tracking-[-1.12px] sm:text-[32px] sm:leading-10 sm:tracking-[-1.28px]">
        {step === "password" ? "Choose a new password" : "Reset password"}
      </h3>
      <p className="mb-8 text-sm leading-5 text-[var(--ds-gray-900)]">
        {subtitle}
      </p>

      <div className="mb-5 flex items-center gap-2">
        {(["email", "otp", "password"] as Step[]).map((item, index) => {
          const current = step === item;
          const done =
            (step === "otp" && item === "email") ||
            (step === "password" && (item === "email" || item === "otp"));
          return (
            <div key={item} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  current
                    ? "bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)]"
                    : done
                      ? "bg-[var(--ds-gray-400)] text-[var(--ds-gray-1000)]"
                      : "bg-[var(--ds-background-200)] text-[var(--ds-gray-700)] ds-border"
                }`}
              >
                {done ? "✓" : index + 1}
              </div>
              {index < 2 ? (
                <div
                  className={`h-px flex-1 ${
                    done
                      ? "bg-[var(--ds-gray-600)]"
                      : "bg-[var(--ds-gray-300)]"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

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
                Send code
              </Button>
            </form>
          ) : null}

          {step === "otp" ? (
            <form onSubmit={submitOtp} className="space-y-5">
              <p className="text-xs text-[var(--ds-gray-700)]">
                Code sent to{" "}
                <span className="font-medium text-[var(--ds-gray-1000)]">
                  {email}
                </span>
              </p>

              {inlineCode ? (
                <div className="rounded-[var(--ds-radius-2)] border border-[var(--ds-gray-400)] bg-[var(--ds-background-200)] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--ds-gray-800)]">
                        Your recovery code
                      </p>
                      <p className="mt-1 select-all font-mono text-2xl font-semibold tracking-[0.35em] text-[var(--ds-gray-1000)]">
                        {inlineCode}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={loading}
                      onClick={copyInlineCode}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--ds-gray-700)]">
                    Copy fills the boxes below. Expires in 10 minutes.
                  </p>
                </div>
              ) : null}

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Label htmlFor="otp" className="mb-0">
                    Enter 6-digit code
                  </Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--ds-focus-color)] disabled:opacity-45"
                    disabled={loading}
                    onClick={pasteFromClipboard}
                  >
                    Paste code
                  </button>
                </div>
                <div className="mt-2">
                  <OtpInput
                    id="otp"
                    value={otp}
                    onChange={setOtp}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="mt-2.5 text-xs text-[var(--ds-gray-700)]">
                  Paste from email works (Ctrl/Cmd+V). Digits only — no spaces.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={otp.length !== 6}
              >
                Verify code
              </Button>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  disabled={loading}
                  onClick={resendCode}
                >
                  Resend code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  disabled={loading}
                  onClick={goToEmail}
                >
                  Use a different email
                </Button>
              </div>
            </form>
          ) : null}

          {step === "password" ? (
            <form onSubmit={submitReset} className="space-y-4">
              <p className="text-xs text-[var(--ds-gray-700)]">
                Setting a new password for{" "}
                <span className="font-medium text-[var(--ds-gray-1000)]">
                  {email}
                </span>
              </p>
              <div>
                <Label htmlFor="new">New password</Label>
                <PasswordInput
                  id="new"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
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
                onClick={goToEmail}
              >
                Start over
              </Button>
            </form>
          ) : null}
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
