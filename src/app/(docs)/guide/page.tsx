"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENTATION_BASE } from "@/lib/docs/portal";

/** Legacy /guide → /documentation */
export default function LegacyGuideRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(DOCUMENTATION_BASE);
  }, [router]);
  return (
    <div className="px-4 py-10 text-sm text-[var(--ds-gray-900)]">
      Redirecting to documentation…
    </div>
  );
}
