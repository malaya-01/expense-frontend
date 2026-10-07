"use client";

import { useParams } from "next/navigation";
import { SpaceDetail } from "@/components/spaces/space-detail";

// Legacy web URL (/spaces/<id>). In-app links use /spaces/view?id=<id>, which
// also works in the Android static export.
export default function SpaceDetailPage() {
  const params = useParams<{ spaceId: string }>();
  const spaceId = decodeURIComponent(params.spaceId ?? "");
  return <SpaceDetail key={spaceId} spaceId={spaceId} />;
}
