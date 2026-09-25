"use client";

import { Fingerprint, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  biometryUnlockCta,
  type FaceUnlockMeta,
} from "@/lib/native/face-unlock";

export function FaceUnlockIcon({
  label,
  size = 18,
}: {
  label: string;
  size?: number;
}) {
  const fingerOnly = /finger|touch/i.test(label) && !/face/i.test(label);
  if (fingerOnly) {
    return <Fingerprint size={size} aria-hidden />;
  }
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      <ScanFace size={size} />
      <Fingerprint size={size} />
    </span>
  );
}

export function FaceUnlockSignInButton({
  meta,
  loading,
  disabled,
  onUnlock,
}: {
  meta: FaceUnlockMeta;
  loading: boolean;
  disabled?: boolean;
  onUnlock: () => void;
}) {
  return (
    <div className="mb-6 space-y-3">
      <Button
        type="button"
        className="w-full"
        loading={loading}
        disabled={disabled}
        onClick={onUnlock}
      >
        <FaceUnlockIcon label={meta.label} />
        {biometryUnlockCta(meta.label)}
      </Button>
      <p className="text-center text-xs text-[var(--ds-gray-700)]">
        Saved for {meta.email}. Use your password if this is a different
        account.
      </p>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
        <span className="h-px flex-1 bg-[var(--ds-gray-200)]" />
        or password
        <span className="h-px flex-1 bg-[var(--ds-gray-200)]" />
      </div>
    </div>
  );
}
