"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken } from "@/lib/api/client";

export default function HomePage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (isAuthenticated || getAccessToken()) {
      router.replace("/dashboard");
    } else {
      router.replace("/signin");
    }
  }, [ready, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[var(--ds-gray-900)]">Loading…</p>
    </div>
  );
}
