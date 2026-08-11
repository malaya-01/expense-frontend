"use client";

import { Suspense } from "react";
import { APP_NAME } from "@/lib/brand";
import AiAdvisorPageInner from "./ai-advisor-client";

export default function AiAdvisorPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--ds-gray-900)]">Loading {APP_NAME} AI…</p>
      }
    >
      <AiAdvisorPageInner />
    </Suspense>
  );
}
