"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { documentationPath, DOCUMENTATION_BASE } from "@/lib/docs/portal";
import { isGuideSlug } from "@/lib/guide/chapters";

export default function LegacyGuideChapterRedirect() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";

  useEffect(() => {
    if (slug && isGuideSlug(slug)) {
      router.replace(documentationPath(slug));
      return;
    }
    router.replace(DOCUMENTATION_BASE);
  }, [router, slug]);

  return (
    <div className="px-4 py-10 text-sm text-[var(--ds-gray-900)]">
      Redirecting to documentation…
    </div>
  );
}
