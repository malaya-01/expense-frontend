"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken } from "@/lib/api/client";

export default function HomePage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();

  useEffect(() => {
    const hasSession = isAuthenticated || Boolean(getAccessToken());
    if (!ready && !hasSession) return;
    router.replace(hasSession ? "/dashboard" : "/signin");
  }, [ready, isAuthenticated, router]);

  return (
    <div className="min-h-dvh bg-[var(--ds-background-100)]">
      <div className="h-0.5 w-full overflow-hidden bg-[color-mix(in_srgb,var(--ds-focus-color)_14%,transparent)]">
        <span className="api-loader-bar block h-full w-1/3 rounded-full bg-[var(--ds-focus-color)]" />
      </div>
    </div>
  );
}
