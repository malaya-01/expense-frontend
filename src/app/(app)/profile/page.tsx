"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Profile now lives in Settings (Profile + Sign-in & security). Kept as a
 * client-side redirect so old links, bookmarks and the static mobile export
 * keep working (config redirects are unavailable with `output: "export"`).
 */
export default function ProfilePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?section=profile");
  }, [router]);
  return (
    <p role="status" className="text-sm text-[var(--ds-gray-700)]">
      Opening your profile…
    </p>
  );
}
