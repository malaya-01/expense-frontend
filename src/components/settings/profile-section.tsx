"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/api/client";
import {
  removeAvatar,
  resolveAvatarUrl,
  updateProfile,
  uploadAvatar,
} from "@/lib/api/user";
import { initials } from "@/lib/format";
import type { User } from "@/types";
import {
  InfoRow,
  SaveBar,
  SettingRow,
  SettingsGroup,
  useReportDirty,
} from "./settings-ui";

export function ProfileSection({ canUpdate }: { canUpdate: boolean }) {
  const { user, setSession } = useAuth();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const savedName = user?.full_name || "";
  const [fullName, setFullName] = useState(savedName);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setFullName(savedName);
  }, [savedName]);

  const dirty = fullName.trim() !== savedName.trim();
  useReportDirty("profile", dirty);

  async function applyUser(updated: User) {
    await setSession({ ...updated, id: updated.id || user!.id });
  }

  async function onSave() {
    const name = fullName.trim();
    if (!name) {
      setNameError("Enter your name.");
      return;
    }
    setNameError("");
    setSaving(true);
    try {
      const updated = await updateProfile({ full_name: name });
      await applyUser(updated);
      showToast({ title: "Profile saved", tone: "success" });
    } catch (err) {
      showToast({
        title: "Could not save profile",
        description: getErrorMessage(err, "Please try again."),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(file: File | null) {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const updated = await uploadAvatar(file);
      await applyUser(updated);
      showToast({ title: "Photo updated", tone: "success" });
    } catch (err) {
      showToast({
        title: "Photo upload failed",
        description: getErrorMessage(err, "Could not upload image."),
        tone: "error",
      });
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemoveAvatar() {
    setAvatarBusy(true);
    try {
      const updated = await removeAvatar();
      await applyUser({ ...updated, avatar_url: null });
      showToast({ title: "Photo removed", tone: "success" });
    } catch (err) {
      showToast({
        title: "Could not remove photo",
        description: getErrorMessage(err, "Please try again."),
        tone: "error",
      });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function copyUserId() {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      showToast({ title: "User ID copied", tone: "success" });
    } catch {
      showToast({ title: "Could not copy", tone: "warning" });
    }
  }

  const avatarSrc = resolveAvatarUrl(user?.avatar_url);

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Photo"
        description="Shown in the sidebar and on shared spaces. JPG, PNG, WebP or GIF up to 5 MB."
      >
        <div className="flex flex-wrap items-center gap-4 py-4">
          <div className="relative shrink-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt="Your profile photo"
                className="size-20 rounded-full object-cover ds-border"
              />
            ) : (
              <div
                aria-hidden
                className="flex size-20 items-center justify-center rounded-full bg-[var(--ds-focus-color)] text-xl font-semibold text-white"
              >
                {initials(user?.full_name, user?.email)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy || !canUpdate}
              aria-label="Upload a new profile photo"
              className="absolute -right-1 -bottom-1 flex size-10 items-center justify-center rounded-full bg-[var(--ds-background-elevated)] text-[var(--ds-gray-1000)] shadow-sm ds-border ds-focus disabled:opacity-50"
            >
              <Camera size={16} aria-hidden />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onPickAvatar(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={avatarBusy}
              disabled={!canUpdate}
              onClick={() => fileRef.current?.click()}
            >
              {avatarSrc ? "Change photo" : "Upload photo"}
            </Button>
            {avatarSrc ? (
              <Button
                variant="ghost"
                disabled={avatarBusy || !canUpdate}
                onClick={() => void onRemoveAvatar()}
                className="text-[var(--ds-status-red)]"
              >
                <Trash2 size={14} aria-hidden />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Account"
        description="Your name appears on reports and shared spaces."
      >
        <SettingRow
          label="Full name"
          htmlFor="settings-full-name"
          description="Use the name you want collaborators to see."
        >
          <Input
            id="settings-full-name"
            value={fullName}
            autoComplete="name"
            maxLength={255}
            disabled={!canUpdate}
            error={nameError || undefined}
            onChange={(e) => setFullName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dirty) {
                e.preventDefault();
                void onSave();
              }
            }}
          />
        </SettingRow>
        <SettingRow
          label="Email"
          htmlFor="settings-email"
          description="Used to sign in and receive reports. Contact support to change it."
        >
          <Input
            id="settings-email"
            value={user?.email || ""}
            readOnly
            aria-readonly
            className="text-[var(--ds-gray-900)]"
          />
        </SettingRow>
        <InfoRow
          label="User ID"
          mono
          value={
            <button
              type="button"
              onClick={() => void copyUserId()}
              className="inline-flex max-w-full items-center gap-1.5 rounded-[6px] px-1.5 py-1 hover:bg-[var(--ds-gray-100)] ds-focus"
              aria-label="Copy user ID"
            >
              <span className="truncate">{user?.id || "—"}</span>
              <Copy size={12} aria-hidden className="shrink-0" />
            </button>
          }
        />
      </SettingsGroup>

      <SaveBar
        dirty={dirty}
        saving={saving}
        disabled={!canUpdate}
        onSave={() => void onSave()}
        onDiscard={() => {
          setFullName(savedName);
          setNameError("");
        }}
      />
    </div>
  );
}
