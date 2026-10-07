"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageSkeleton } from "@/components/ui/feedback";
import { SpaceDetail } from "@/components/spaces/space-detail";

// /spaces/view?id=<spaceId> — a single static page, so it is reachable in the
// Android static export (dynamic /spaces/<id> segments are not pre-rendered).
function SpaceView() {
  const router = useRouter();
  const spaceId = useSearchParams().get("id")?.trim() ?? "";

  useEffect(() => {
    if (!spaceId) router.replace("/spaces");
  }, [spaceId, router]);

  if (!spaceId) return <PageSkeleton />;
  return <SpaceDetail key={spaceId} spaceId={spaceId} />;
}

export default function SpaceViewPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SpaceView />
    </Suspense>
  );
}
