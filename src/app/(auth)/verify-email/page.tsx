"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { verifyEmail } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { APP_NAME } from "@/lib/brand";

/** Prevent Strict Mode double-mount from leaving the UI stuck on loading. */
const verifiedTokens = new Set<string>();
const inflightTokens = new Map<string, Promise<{ message: string; email?: string }>>();

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token") || "";
  // Email clients sometimes wrap/split long query values.
  const token = rawToken.trim().replace(/\s+/g, "");
  const { showToast } = useToast();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        if (verifiedTokens.has(token)) {
          if (cancelled) return;
          setStatus("ok");
          setMessage("Email verified successfully. You can sign in now.");
          return;
        }

        let pending = inflightTokens.get(token);
        if (!pending) {
          pending = verifyEmail(token).finally(() => {
            inflightTokens.delete(token);
          });
          inflightTokens.set(token, pending);
        }

        const result = await pending;
        verifiedTokens.add(token);
        if (cancelled) return;
        setStatus("ok");
        setMessage(result.message || "Email verified. You can sign in now.");
        showToast({
          title: "Email verified",
          description: `You can sign in to ${APP_NAME}.`,
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
