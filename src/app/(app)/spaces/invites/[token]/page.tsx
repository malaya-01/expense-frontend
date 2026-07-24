"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptSpaceInvite } from "@/lib/api/spaces";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";

export default function AcceptSpaceInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onAccept() {
    setBusy(true);
    try {
      const result: any = await acceptSpaceInvite(params.token);
      showToast({ title: "Joined space", tone: "success" });
      router.replace(`/spaces/${result.space_id || result.space?.id || ""}`);
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
              You’ve been invited
            </h2>
            <p className="mt-1 text-sm leading-5 text-[var(--ds-gray-700)]">
              Join this shared FinOS workspace to track expenses, balances, and
              settlements with the group.
            </p>
          </div>
        </div>
        <Button className="mt-5 w-full sm:w-auto" loading={busy} onClick={() => void onAccept()}>
          Accept invite
        </Button>
      </article>
    </div>
  );
}
