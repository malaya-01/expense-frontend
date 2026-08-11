"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { resendVerification } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { APP_NAME } from "@/lib/brand";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function onResend() {
    if (!email) return;
    setLoading(true);
    try {
      const result = await resendVerification(email);
      showToast({
        title: "Verification email sent",
        description: result.message,
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not resend",
        description: getErrorMessage(err, "Try again in a minute."),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 font-heading text-[28px] leading-9 tracking-[-1.12px] sm:text-[32px]">
        Verify your email
      </h3>
      <p className="mb-8 text-sm leading-5 text-[var(--ds-gray-900)]">
        We sent a verification link
        {email ? (
          <>
            {" "}
            to <span className="font-medium text-[var(--ds-gray-1000)]">{email}</span>
          </>
        ) : null}
        . It expires in 1 hour.
      </p>

      <Card>
        <CardBody className="space-y-4 pt-6">
          <p className="text-sm leading-6 text-[var(--ds-gray-900)]">
            Open the link in your inbox to activate {APP_NAME}. Until then, the app
            stays locked for this account.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              loading={loading}
              disabled={!email}
              onClick={onResend}
            >
              Resend link
            </Button>
            <Link href="/signin" className="flex-1">
              <Button type="button" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  );
}
