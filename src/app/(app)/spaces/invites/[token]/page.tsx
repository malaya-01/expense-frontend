"use client";

import { useParams } from "next/navigation";
import { SpaceInviteAccept } from "@/components/spaces/space-invite-accept";

// Legacy web URL (/spaces/invites/<token>). In-app links use
// /spaces/invites/accept?token=<token>, which also works in the Android
// static export.
export default function AcceptSpaceInvitePage() {
  const params = useParams<{ token: string }>();
  return <SpaceInviteAccept token={decodeURIComponent(params.token ?? "")} />;
}
