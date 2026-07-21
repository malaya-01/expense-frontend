"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { ColorField } from "@/components/ui/color-field";
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

function ThemePickCard({
  theme,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  theme: ThemeDefinition;
  active: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] bg-[var(--ds-background-elevated)] p-3",
        active
          ? "ring-2 ring-[var(--ds-focus-color)] ring-offset-2 ring-offset-[var(--ds-background-100)]"
          : "ds-border",
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left ds-focus rounded-[6px]">
        <ThemeSwatch theme={theme} />
        <p className="mt-2 text-sm text-[var(--ds-gray-1000)]">{theme.name}</p>
      </button>
      {onEdit || onDelete ? (
        <div className="mt-2 flex gap-1">
          {onEdit ? (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
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

/** Compact appearance card — full theme browser lives in a modal. */
export function AppearanceSection() {
  const {
    activeTheme,
    activeThemeId,
    presetThemes,
    customThemes,
    setTheme,
    createTheme,
    updateTheme,
    deleteTheme,
  } = useTheme();

  const [browseOpen, setBrowseOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomThemeInput>(EMPTY_FORM);

  const editingTheme = useMemo(
    () => customThemes.find((t) => t.id === editingId),
    [customThemes, editingId],
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, name: "My theme" });
    setEditorOpen(true);
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
    setEditorOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) updateTheme(editingId, form);
    else createTheme(form);
    setEditorOpen(false);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <h2>Appearance</h2>
            <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
              Active theme for FinOS surfaces.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setBrowseOpen(true)}>
            Browse themes
          </Button>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            {activeTheme ? <ThemeSwatch theme={activeTheme} /> : null}
            <div className="min-w-0">
              <p className="text-sm text-[var(--ds-gray-1000)]">
                {activeTheme?.name || "Default"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ds-gray-700)]">
                {activeTheme?.builtin === false ? "Custom theme" : "Preset theme"}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        title="Themes"
        className="max-w-3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBrowseOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setBrowseOpen(false);
                openCreate();
              }}
            >
              Create theme
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <section>
            <h2 className="mb-3 text-sm">Presets</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {presetThemes.map((theme) => (
                <ThemePickCard
                  key={theme.id}
                  theme={theme}
                  active={activeThemeId === theme.id}
                  onSelect={() => setTheme(theme.id)}
                />
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm">Your themes</h2>
            {customThemes.length === 0 ? (
              <p className="text-sm text-[var(--ds-gray-900)]">
                No custom themes yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {customThemes.map((theme) => (
                  <ThemePickCard
                    key={theme.id}
                    theme={theme}
                    active={activeThemeId === theme.id}
                    onSelect={() => setTheme(theme.id)}
                    onEdit={() => {
                      setBrowseOpen(false);
                      openEdit(theme);
                    }}
                    onDelete={() => deleteTheme(theme.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </Modal>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? "Edit theme" : "Create theme"}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button form="theme-form" type="submit">
              {editingId ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="theme-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="theme-name">Name</Label>
            <Input
              id="theme-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <ColorField
                  id={field.key}
                  value={form[field.key]}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      [field.key]: value,
                    }))
                  }
                />
              </div>
            ))}
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

/** Backward-compatible export used by older imports */
export function ThemeSettings() {
  return <AppearanceSection />;
}
