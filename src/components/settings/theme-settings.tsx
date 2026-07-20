"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme-context";
import type { CustomThemeInput, ThemeDefinition } from "@/lib/themes/types";

const COLOR_FIELDS: Array<{
  key: keyof CustomThemeInput;
  label: string;
  hint?: string;
}> = [
  { key: "background100", label: "Background", hint: "Page canvas" },
  { key: "backgroundElevated", label: "Surface", hint: "Cards and panels" },
  { key: "gray1000", label: "Text", hint: "Primary text" },
  { key: "gray900", label: "Muted text", hint: "Secondary labels" },
  { key: "focusColor", label: "Accent", hint: "Links and focus" },
];

const EMPTY_FORM: CustomThemeInput = {
  name: "",
  background100: "#fafafa",
  backgroundElevated: "#ffffff",
  gray1000: "#171717",
  gray900: "#4d4d4d",
  focusColor: "#0072f5",
};

function ThemeSwatch({ theme }: { theme: ThemeDefinition }) {
  const { tokens } = theme;
  return (
    <div className="flex h-8 overflow-hidden rounded-[6px] ds-border">
      <span className="flex-1" style={{ background: tokens.background100 }} />
      <span className="flex-1" style={{ background: tokens.backgroundElevated }} />
      <span className="flex-1" style={{ background: tokens.gray1000 }} />
      <span className="w-6" style={{ background: tokens.focusColor }} />
    </div>
  );
}

function ThemeCard({
  theme,
  active,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  theme: ThemeDefinition;
  active: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}) {
  const showActions = Boolean(onEdit || onDelete || onDuplicate);

  return (
    <div
      className={cn(
        "rounded-[12px] bg-[var(--ds-background-elevated)] p-4 transition-colors",
        active
          ? "ring-2 ring-[var(--ds-focus-color)] ring-offset-2 ring-offset-[var(--ds-background-100)]"
          : "ds-border",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full rounded-[6px] text-left ds-focus"
      >
        <ThemeSwatch theme={theme} />
        <div className="mt-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-[var(--ds-gray-1000)]">{theme.name}</p>
            {theme.description ? (
              <p className="mt-0.5 text-xs text-[var(--ds-gray-700)]">
                {theme.description}
              </p>
            ) : null}
          </div>
          {active ? (
            <span className="shrink-0 rounded-full bg-[var(--ds-gray-100)] px-2 py-0.5 text-[11px] text-[var(--ds-gray-900)]">
              Active
            </span>
          ) : null}
        </div>
      </button>

      {showActions ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {onEdit ? (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {onDuplicate ? (
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              Duplicate
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--ds-status-red)]"
              onClick={onDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ThemeSettings() {
  const {
    activeThemeId,
    presetThemes,
    customThemes,
    setTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
  } = useTheme();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomThemeInput>(EMPTY_FORM);

  const editingTheme = useMemo(
    () => customThemes.find((t) => t.id === editingId),
    [customThemes, editingId],
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, name: "My theme" });
    setModalOpen(true);
  }

  function openEdit(theme: ThemeDefinition) {
    setEditingId(theme.id);
    setForm({
      name: theme.name,
      background100: theme.tokens.background100,
      backgroundElevated: theme.tokens.backgroundElevated,
      gray1000: theme.tokens.gray1000,
      gray900: theme.tokens.gray900,
      focusColor: theme.tokens.focusColor,
    });
    setModalOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      updateTheme(editingId, form);
    } else {
      createTheme(form);
    }
    setModalOpen(false);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <h2>Appearance</h2>
            <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
              Choose a preset or build your own palette.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            Create theme
          </Button>
        </CardHeader>
        <CardBody className="space-y-6">
          <section>
            <h2 className="mb-3">Preset themes</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {presetThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  active={activeThemeId === theme.id}
                  onSelect={() => setTheme(theme.id)}
                  onDuplicate={() => {
                    const copy = duplicateTheme(theme.id);
                    if (copy) openEdit(copy);
                  }}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2>Your themes</h2>
              <span className="text-xs text-[var(--ds-gray-700)]">
                {customThemes.length} saved
              </span>
            </div>
            {customThemes.length === 0 ? (
              <div className="rounded-[12px] bg-[var(--ds-background-100)] px-4 py-8 text-center">
                <p className="text-sm text-[var(--ds-gray-1000)]">
                  No custom themes yet
                </p>
                <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                  Pick colors for background, surface, text, and accent.
                </p>
                <Button className="mt-4" size="sm" onClick={openCreate}>
                  Create your first theme
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {customThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    active={activeThemeId === theme.id}
                    onSelect={() => setTheme(theme.id)}
                    onEdit={() => openEdit(theme)}
                    onDelete={() => deleteTheme(theme.id)}
                    onDuplicate={() => {
                      const copy = duplicateTheme(theme.id);
                      if (copy) openEdit(copy);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit theme" : "Create theme"}
        className="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="theme-form" type="submit">
              {editingId ? "Save theme" : "Create theme"}
            </Button>
          </>
        }
      >
        <form id="theme-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="theme-name">Theme name</Label>
            <Input
              id="theme-name"
              required
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Midnight workspace"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id={field.key}
                    type="color"
                    value={form[field.key]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="size-10 shrink-0 cursor-pointer rounded-[6px] border-0 bg-transparent p-0"
                  />
                  <Input
                    value={form[field.key]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="font-mono text-xs"
                  />
                </div>
                {field.hint ? (
                  <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
                    {field.hint}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="rounded-[12px] bg-[var(--ds-background-100)] p-4">
            <p className="text-xs text-[var(--ds-gray-700)]">Preview</p>
            <div
              className="mt-3 rounded-[12px] p-4 ds-border"
              style={{ background: form.background100 }}
            >
              <div
                className="rounded-[8px] p-3 ds-border"
                style={{ background: form.backgroundElevated }}
              >
                <p className="text-sm" style={{ color: form.gray1000 }}>
                  Expense overview
                </p>
                <p className="mt-1 text-xs" style={{ color: form.gray900 }}>
                  Secondary label text
                </p>
                <p
                  className="mt-2 text-xs"
                  style={{ color: form.focusColor }}
                >
                  Accent link
                </p>
              </div>
            </div>
          </div>

          {editingTheme ? (
            <p className="text-xs text-[var(--ds-gray-700)]">
              Editing {editingTheme.name}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
