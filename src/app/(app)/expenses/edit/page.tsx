"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageSkeleton } from "@/components/ui/feedback";
import { EditTransaction } from "./edit-transaction";

// /expenses/edit?id=<transactionId> — a single static page, so it is reachable
// in the Android static export (dynamic /expenses/<id> is not pre-rendered).
function EditTransactionFromQuery() {
  const id = useSearchParams().get("id")?.trim() ?? "";
  return <EditTransaction key={id} transactionId={id} />;
}

export default function EditTransactionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditTransactionFromQuery />
    </Suspense>
  );
}
