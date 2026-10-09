"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/api/client";
import { deleteAccount } from "@/lib/api/user";
import { isOnline } from "@/lib/offline/network";
import { APP_NAME } from "@/lib/brand";
import { SettingsGroup } from "./settings-ui";

const CONFIRM_WORD = "DELETE";

export function DangerSection({ canUpdate }: { canUpdate: boolean }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready = confirmation.trim() === CONFIRM_WORD && password.length > 0;

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirmation("");
    setPassword("");
    setError("");
  }

  async function onDelete() {
    if (!ready) return;
    if (!isOnline()) {
      setError("You're offline. Connect to the internet to delete your account.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteAccount({ password, confirmation: CONFIRM_WORD });
      showToast({
        title: "Account deleted",
        description: `Your ${APP_NAME} account was deleted and every device signed out.`,
        tone: "success",
      });
      await logout();
      router.replace("/signin");
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete the account."));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsGroup
        tone="danger"
        title="Delete account"
        description="Permanently close your account. You'll be signed out on every device, uploaded files (receipts, photo) are removed, and you won't be able to sign in again with this email."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="min-w-0 text-[12px] leading-5 text-[var(--ds-gray-700)]">
            Export your data first from Data &amp; sync if you want to keep a copy.
          </p>
          <Button
            variant="danger"
            disabled={!canUpdate}
            onClick={() => setOpen(true)}
          >
            Delete account…
          </Button>
        </div>
      </SettingsGroup>

      <Modal
        open={open}
        onClose={close}
        title="Delete your account?"
        className="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={!ready}
              onClick={() => void onDelete()}
            >
              Delete account
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onDelete();
          }}
        >
          <p className="text-[13px] leading-5 text-[var(--ds-gray-900)]">
            This signs <strong>{user?.email}</strong> out everywhere and can&apos;t
            be undone from the app.
          </p>
          <div>
            <Label htmlFor="delete-confirm">
              Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={confirmation}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="delete-password">Your password</Label>
            <PasswordInput
              id="delete-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-[12.5px] text-[var(--ds-status-red)]">
              {error}
            </p>
          ) : null}
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </Modal>
    </div>
  );
}
