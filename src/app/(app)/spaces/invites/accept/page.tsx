"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageSkeleton } from "@/components/ui/feedback";
import { SpaceInviteAccept } from "@/components/spaces/space-invite-accept";

// /spaces/invites/accept?token=<token> — a single static page, so it is
// reachable in the Android static export.
function InviteAccept() {
  const token = useSearchParams().get("token")?.trim() ?? "";
  return <SpaceInviteAccept key={token} token={token} />;
}

export default function AcceptSpaceInviteQueryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InviteAccept />
    </Suspense>
  );
}
