"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptSpaceInvite } from "@/lib/api/spaces";
import { getErrorMessage } from "@/lib/api/client";
import { APP_NAME } from "@/lib/brand";
import { useToast } from "@/components/ui/toast";
import { spaceHref } from "@/components/spaces/space-links";

/**
 * Accept-invite view. Rendered by `/spaces/invites/accept?token=<token>`
 * (static export friendly; used by the Android app) and by the legacy
 * `/spaces/invites/<token>` dynamic route on the web.
 */
export function SpaceInviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onAccept() {
    if (!token) return;
    setBusy(true);
    try {
      const result: any = await acceptSpaceInvite(token);
      showToast({ title: "Joined space", tone: "success" });
      const spaceId = result?.space_id || result?.space?.id || "";
      router.replace(spaceId ? spaceHref(String(spaceId)) : "/spaces");
    } catch (err) {
      showToast({
        title: "Invite invalid",
        description: getErrorMessage(err, "Token may have expired"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[32px]">
          Space invite
        </h1>
        <p className="mt-1 text-sm text-[var(--ds-gray-700)]">
          Accept to join this Collaborative Space.
        </p>
      </div>

      <article className="rounded-[16px] bg-[var(--ds-background-elevated)] p-5 ds-border sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[12px]"
            style={{
              color: "var(--ds-status-blue)",
              background:
                "color-mix(in srgb, var(--ds-status-blue) 14%, transparent)",
            }}
          >
            <UsersRound size={18} strokeWidth={1.85} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--ds-gray-1000)]">
              {token ? "You’ve been invited" : "Invite link incomplete"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-[var(--ds-gray-700)]">
              {token
                ? `Join this shared ${APP_NAME} workspace to track expenses, balances, and settlements with the group.`
                : "This invite link is missing its token. Open the invite from your notifications again."}
            </p>
          </div>
        </div>
        {token ? (
          <Button
            className="mt-5 w-full sm:w-auto"
            loading={busy}
            onClick={() => void onAccept()}
          >
            Accept invite
          </Button>
        ) : (
          <Link
            href="/spaces"
            className="mt-5 inline-flex text-sm font-medium text-[var(--ds-focus-color)] ds-focus rounded-[6px]"
          >
            Go to spaces
          </Link>
        )}
      </article>
    </div>
  );
}
