"use client";

import { Suspense } from "react";
import AiAdvisorPageInner from "./ai-advisor-client";

export default function AiAdvisorPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--ds-gray-900)]">Loading FinOS AI…</p>
      }
    >
      <AiAdvisorPageInner />
    </Suspense>
  );
}
