"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { verifyEmail } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { showToast } = useToast();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");
  const startedForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    // Prevent React Strict Mode / remount from consuming the link twice.
    if (startedForToken.current === token) return;
    startedForToken.current = token;

    let cancelled = false;
    async function run() {
      try {
        const result = await verifyEmail(token);
        if (cancelled) return;
        setStatus("ok");
        setMessage(result.message || "Email verified. You can sign in now.");
        showToast({
          title: "Email verified",
          description: "You can sign in to FinOS.",
          tone: "success",
        });
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(getErrorMessage(err, "Verification failed"));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token, showToast]);

  return (
    <div>
      <h3 className="mb-2 font-heading text-[28px] leading-9 tracking-[-1.12px] sm:text-[32px]">
        Email verification
      </h3>
      <p className="mb-8 text-sm leading-5 text-[var(--ds-gray-900)]">
        {status === "loading"
          ? "Confirming your verification link…"
          : status === "ok"
            ? "Your account is ready."
            : "We could not verify this link."}
      </p>
      <Card>
        <CardBody className="space-y-4 pt-6">
          <p className="text-sm leading-6 text-[var(--ds-gray-900)]">{message}</p>
          <Button
            className="w-full"
            onClick={() => router.replace("/signin")}
            disabled={status === "loading"}
          >
            Continue to sign in
          </Button>
          {status === "error" ? (
            <p className="text-center text-xs text-[var(--ds-gray-700)]">
              Need a new link?{" "}
              <Link href="/signin" className="text-[var(--ds-focus-color)]">
                Sign in
              </Link>{" "}
              with your password to resend it.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
