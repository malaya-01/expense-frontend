"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Settings, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  COUNTRIES,
  SUPPORTED_CURRENCIES,
  getCountry,
} from "@/lib/currency/currency.data";
import {
  changePassword,
  getCurrentUser,
  removeAvatar,
  resolveAvatarUrl,
  updateProfile,
  uploadAvatar,
} from "@/lib/api/user";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function ProfilePage() {
  const { user, setSession } = useAuth();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [country, setCountry] = useState(user?.country || "US");
  const [currency, setCurrency] = useState(user?.currency || "USD");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.avatar_url || null,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const sortedCountries = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const initials = (fullName || user?.email || "F")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const profile = await getCurrentUser();
        if (cancelled) return;
        setFullName(profile.full_name || "");
        setCountry(profile.country || "US");
        setCurrency(profile.currency || "USD");
        setTimezone(profile.timezone || "UTC");
        setAvatarUrl(profile.avatar_url || null);
        setSession({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          country: profile.country,
          currency: profile.currency,
          timezone: profile.timezone,
          locale: profile.locale,
          avatar_url: profile.avatar_url,
        });
      } catch {
        // Fall back to session values already in state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  function onCountryChange(code: string) {
    setCountry(code);
    const meta = getCountry(code);
    if (meta) setCurrency(meta.currency);
  }

  async function onPickAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      setAvatarUrl(updated.avatar_url || null);
      setSession({
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        country: updated.country,
        currency: updated.currency,
        timezone: updated.timezone,
        locale: updated.locale,
        avatar_url: updated.avatar_url,
      });
      showToast({
        title: "Photo updated",
        description: "Your profile picture was uploaded.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Avatar upload failed",
        description: getErrorMessage(err, "Could not upload image"),
        tone: "error",
      });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemoveAvatar() {
    setUploadingAvatar(true);
    try {
      const updated = await removeAvatar();
      setAvatarUrl(null);
      setSession({
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        country: updated.country,
        currency: updated.currency,
        timezone: updated.timezone,
        locale: updated.locale,
        avatar_url: null,
      });
      showToast({
        title: "Photo removed",
        description: "Your profile picture was cleared.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not remove photo",
        description: getErrorMessage(err, "Please try again"),
        tone: "error",
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        country,
        currency,
        timezone,
      });
      setSession({
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        country: updated.country,
        currency: updated.currency,
        timezone: updated.timezone,
        locale: updated.locale,
        avatar_url: updated.avatar_url,
      });
      showToast({
        title: "Profile saved",
        description: "Your account details were updated.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not save profile",
        description: getErrorMessage(err, "Please try again"),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast({
        title: "Passwords do not match",
        description: "Re-enter the same new password in both fields.",
        tone: "warning",
      });
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      showToast({
        title: "Password updated",
        description: "Use your new password next time you sign in.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Password change failed",
        description: getErrorMessage(err, "Check your current password"),
        tone: "error",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Manage your identity, workspace defaults, and password."
        actions={
          <Link href="/settings">
            <Button variant="secondary" size="sm">
              <Settings size={14} />
              Settings
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="self-start">
          <CardBody className="flex flex-col items-center py-7 text-center">
            <div className="relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveAvatarUrl(avatarUrl) || undefined}
                  alt=""
                  className="size-24 rounded-full object-cover ds-border"
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-full bg-[var(--ds-focus-color)] text-2xl font-semibold text-white">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-[var(--ds-background-elevated)] text-[var(--ds-gray-1000)] shadow-sm ds-border ds-focus disabled:opacity-50"
                aria-label="Upload profile photo"
              >
                <Camera size={15} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
              />
            </div>
            <p className="mt-5 font-heading text-base font-semibold">
              {fullName || user?.full_name || "FinOS user"}
            </p>
            <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
              {user?.email || "—"}
            </p>
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={uploadingAvatar}
                onClick={() => fileRef.current?.click()}
              >
                {uploadingAvatar ? "Uploading…" : "Change photo"}
              </Button>
              {avatarUrl ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[var(--ds-status-red)]"
                  disabled={uploadingAvatar}
                  onClick={() => void onRemoveAvatar()}
                >
                  <Trash2 size={13} />
                  Remove photo
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-heading text-base font-semibold">
                Account details
              </h2>
              <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                Email stays tied to verification. Update your display name and
                reporting defaults here.
              </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={onSaveProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ""} disabled />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select
                      id="country"
                      value={country}
                      onChange={(e) => onCountryChange(e.target.value)}
                      disabled={loading}
                    >
                      {sortedCountries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Base currency</Label>
                    <Select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={loading}
                    >
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={loading}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      value={user?.id || ""}
                      disabled
                      className="font-mono text-[11px]"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={saving} disabled={loading}>
                    Save profile
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-heading text-base font-semibold">
                Change password
              </h2>
              <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                Use a strong password with at least 8 characters.
              </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={onChangePassword} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmNewPassword">Confirm new</Label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={savingPassword}>
                    Update password
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
