"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await generateOtp(email);
      showToast({
        title: "Recovery code sent",
        description:
          result.message ||
          "If an account exists for this email, a code was sent.",
        tone: "success",
      });
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
        otp,
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
                <p className="mt-1.5 text-xs text-[var(--ds-gray-700)]">
                  The code expires after 10 minutes and can only be used once.
                </p>
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
