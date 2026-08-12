"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  GuideChapterHeader,
  GuideShell,
} from "@/components/guide/guide-shell";
import { GUIDE_PAGE_CONTENT } from "@/components/guide/pages";
import { getGuideChapter, isGuideSlug } from "@/lib/guide/chapters";

export default function GuideChapterPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";

  useEffect(() => {
    if (!slug || !isGuideSlug(slug)) {
      router.replace("/guide");
    }
  }, [router, slug]);

  const chapter = getGuideChapter(slug);
  const Content = slug ? GUIDE_PAGE_CONTENT[slug] : undefined;

  if (!chapter || !Content) {
    return (
      <div className="px-4 py-10 text-sm text-[var(--ds-gray-900)]">
        Loading guide…
      </div>
    );
  }

  return (
    <GuideShell chapter={chapter}>
      <GuideChapterHeader chapter={chapter} />
      <Content />
    </GuideShell>
  );
}
