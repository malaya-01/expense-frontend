"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/feedback";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/api/client";
import {
  changePassword,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  type UserSession,
} from "@/lib/api/user";
import { formatDateTime, formatRelativeDay } from "@/lib/format";
import { isOnline } from "@/lib/offline/network";
import { getClientPlatform } from "@/lib/runtime-platform";
import { SettingRow, SettingsGroup } from "./settings-ui";

/** "[opal:native-android] Mozilla/5.0 (…)" → device label + icon kind. */
function describeSession(ua: string | null): {
  label: string;
  detail: string;
  kind: "phone" | "tablet" | "desktop";
} {
  const raw = ua || "";
  const tag = raw.match(/^\[opal:([^\]]+)\]/)?.[1] || "";
  const lower = raw.toLowerCase();
  const os = /android/.test(lower)
    ? "Android"
    : /iphone|ipad|ipod/.test(lower)
      ? "iOS"
      : /windows/.test(lower)
        ? "Windows"
        : /mac os x|macintosh/.test(lower)
          ? "macOS"
          : /linux/.test(lower)
            ? "Linux"
            : "";
  const browser = /edg\//.test(lower)
    ? "Edge"
    : /opr\/|opera/.test(lower)
      ? "Opera"
      : /firefox\//.test(lower)
        ? "Firefox"
        : /chrome\//.test(lower)
          ? "Chrome"
          : /safari\//.test(lower)
            ? "Safari"
            : "";
  const native = tag.startsWith("native");
  const kind: "phone" | "tablet" | "desktop" =
    /tablet|ipad/.test(tag + lower)
      ? "tablet"
      : native || /mobile|phone/.test(tag) || /mobile/.test(lower)
        ? "phone"
        : "desktop";
  const label = native
    ? `Opal app${os ? ` on ${os}` : ""}`
    : browser
      ? `${browser}${os ? ` on ${os}` : ""}`
      : os || "Unknown device";
  return { label, detail: native ? "Mobile app" : "Web browser", kind };
}

function SessionIcon({ kind }: { kind: "phone" | "tablet" | "desktop" }) {
  const Icon = kind === "phone" ? Smartphone : kind === "tablet" ? Tablet : Monitor;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ds-background-200)] text-[var(--ds-gray-900)]">
      <Icon size={18} aria-hidden />
    </span>
  );
}

export function SecuritySection({ canUpdate }: { canUpdate: boolean }) {
  const router = useRouter();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [sessions, setSessions] = useState<UserSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!isOnline()) {
      setSessionsError("Connect to the internet to see your active sessions.");
      setLoadingSessions(false);
      return;
    }
    setLoadingSessions(true);
    setSessionsError("");
    try {
      setSessions(await listSessions());
    } catch (err) {
      setSessionsError(getErrorMessage(err, "Could not load sessions."));
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("The new passwords don't match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("Choose a password different from the current one.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      showToast({
        title: "Password updated",
        description: "Every session was signed out. Sign in with your new password.",
        tone: "success",
      });
      // The backend revokes all sessions on password change.
      await logout();
      router.replace("/signin");
    } catch (err) {
      setPasswordError(getErrorMessage(err, "Check your current password."));
    } finally {
      setSavingPassword(false);
    }
  }

  async function onRevoke(session: UserSession) {
    setRevokingId(session.id);
    try {
      await revokeSession(session.id);
      setSessions((list) => list?.filter((item) => item.id !== session.id) ?? null);
      showToast({
        title: "Session signed out",
        description: "That device will be asked to sign in again.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not sign out that session",
        description: getErrorMessage(err),
        tone: "error",
      });
    } finally {
      setRevokingId(null);
    }
  }

  async function onRevokeOthers() {
    setRevokingOthers(true);
    try {
      const { revoked } = await revokeOtherSessions();
      setConfirmOthers(false);
      await loadSessions();
      showToast({
        title:
          revoked > 0
            ? `Signed out of ${revoked} other ${revoked === 1 ? "session" : "sessions"}`
            : "No other sessions",
        description:
          revoked > 0
            ? "Those devices must sign in again. This device stays signed in."
            : "Only this device is signed in.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not sign out other devices",
        description: getErrorMessage(err),
        tone: "error",
      });
    } finally {
      setRevokingOthers(false);
    }
  }

  const otherCount = sessions?.filter((s) => !s.current).length ?? 0;
  const platform = getClientPlatform();

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Change password"
        description="You'll be signed out everywhere, including this device, and need to sign in again."
      >
        <form onSubmit={onChangePassword} className="py-2" noValidate>
          <SettingRow label="Current password" htmlFor="settings-current-password">
            <PasswordInput
              id="settings-current-password"
              autoComplete="current-password"
              required
              value={currentPassword}
              disabled={!canUpdate}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </SettingRow>
          <SettingRow
            label="New password"
            htmlFor="settings-new-password"
            description="At least 8 characters."
          >
            <PasswordInput
              id="settings-new-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              disabled={!canUpdate}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </SettingRow>
          <SettingRow label="Confirm new password" htmlFor="settings-confirm-password">
            <PasswordInput
              id="settings-confirm-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmNewPassword}
              disabled={!canUpdate}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </SettingRow>
          {passwordError ? (
            <p role="alert" className="pb-2 text-[12.5px] text-[var(--ds-status-red)]">
              {passwordError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2 py-3">
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="min-h-10 rounded-[8px] px-1 text-[12.5px] text-[var(--ds-link-color)] hover:underline ds-focus"
            >
              Forgot it? Reset by email
            </button>
            <Button
              type="submit"
              loading={savingPassword}
              disabled={
                !canUpdate ||
                !currentPassword ||
                !newPassword ||
                !confirmNewPassword
              }
            >
              Update password
            </Button>
          </div>
        </form>
      </SettingsGroup>

      <SettingsGroup
        title="Where you're signed in"
        description="Sessions stay active for 7 days after last use. Signing a device out takes effect the next time it refreshes (within ~15 minutes)."
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadSessions()}
            disabled={loadingSessions}
            aria-label="Refresh session list"
          >
            <RefreshCw size={13} aria-hidden className={loadingSessions ? "animate-spin" : undefined} />
            Refresh
          </Button>
        }
      >
        {loadingSessions && !sessions ? (
          <div role="status" className="space-y-3 py-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="size-10 animate-pulse rounded-[10px] bg-[var(--ds-gray-100)]" />
                <span className="h-4 w-48 animate-pulse rounded-[6px] bg-[var(--ds-gray-100)]" />
              </div>
            ))}
            <span className="sr-only">Loading sessions…</span>
          </div>
        ) : sessionsError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-[12.5px] text-[var(--ds-gray-900)]">{sessionsError}</p>
            <Button variant="secondary" size="sm" onClick={() => void loadSessions()}>
              Try again
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)]">
            {(sessions ?? []).map((session) => {
              const info = describeSession(session.user_agent);
              return (
                <li key={session.id} className="flex flex-wrap items-center gap-3 py-3">
                  <SessionIcon kind={info.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-[var(--ds-gray-1000)]">
                      <span className="truncate">{info.label}</span>
                      {session.current ? <Badge tone="success">This device</Badge> : null}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-4 text-[var(--ds-gray-700)]">
                      {session.ip_address ? `${session.ip_address} · ` : ""}
                      Last active {formatRelativeDay(session.last_used_at).toLowerCase()} ·
                      Signed in {formatDateTime(session.created_at)}
                    </p>
                  </div>
                  {session.current ? null : (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={revokingId === session.id}
                      disabled={!canUpdate}
                      onClick={() => void onRevoke(session)}
                      aria-label={`Sign out ${info.label}`}
                    >
                      Sign out
                    </Button>
                  )}
                </li>
              );
            })}
            {sessions && sessions.length === 0 ? (
              <li className="py-4 text-[12.5px] text-[var(--ds-gray-700)]">
                No active sessions found.
              </li>
            ) : null}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="min-w-0 text-[12px] leading-5 text-[var(--ds-gray-700)]">
            Lost a phone or used a shared computer? End every session except this one.
          </p>
          <Button
            variant="danger"
            disabled={!canUpdate || otherCount === 0}
            onClick={() => setConfirmOthers(true)}
          >
            Sign out other devices
          </Button>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="This device"
        description={`Signed in on ${platform.label}. Closing the app does not sign you out.`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="min-w-0 text-[12px] leading-5 text-[var(--ds-gray-700)]">
            Signing out removes this account's offline data from this device.
            Sync first if you have unsynced changes.
          </p>
          <Button variant="secondary" onClick={() => setConfirmLogout(true)}>
            <LogOut size={14} aria-hidden />
            Sign out
          </Button>
        </div>
      </SettingsGroup>

      <ConfirmDialog
        open={confirmOthers}
        title="Sign out other devices?"
        description={`This ends ${otherCount} other ${otherCount === 1 ? "session" : "sessions"}. Those devices will need your password to sign in again. This device stays signed in.`}
        confirmLabel="Sign out others"
        destructive
        busy={revokingOthers}
        onClose={() => setConfirmOthers(false)}
        onConfirm={onRevokeOthers}
      />
      <ConfirmDialog
        open={confirmLogout}
        title="Sign out of this device?"
        description="You'll need your email and password to sign in again. Unsynced offline changes on this device will be lost."
        confirmLabel="Sign out"
        destructive
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => {
          await logout();
          router.replace("/signin");
        }}
      />
    </div>
  );
}
