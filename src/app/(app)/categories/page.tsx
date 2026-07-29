"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lightbulb, Plus, Search, Check } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardBody } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CategoryCard } from "@/components/categories/category-card";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/api/categories";
import { getErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton } from "@/components/ui/feedback";
import { CategoryNameWithIcon } from "@/components/categories/category-icon-picker";
import { cn } from "@/lib/cn";
import {
  normalizeCategoryIcon,
  suggestCategoryIconHeuristic,
  type CategoryIconId,
} from "@/lib/categories/icons";
import type { Category, CreateCategoryInput } from "@/types";

const COLORS = [
  "#6B7280",
  "#E5484D",
  "#EA3E83",
  "#16A34A",
  "#0D9488",
  "#7C3AED",
  "#2563EB",
  "#4338CA",
  "#FF990A",
  "#0062D1",
];

const emptyForm: CreateCategoryInput = {
  name: "",
  description: "",
  color: COLORS[0],
  icon: "tags",
  budget_amount: undefined,
  budget_period: "MONTHLY",
};

type FilterKind = "all" | "budgeted" | "unbudgeted";

export default function CategoriesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const currency = user?.currency || "USD";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CreateCategoryInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listCategories();
      setCategories(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load categories"));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((category) => {
      const hasBudget = Boolean(
        category.budget_amount && Number(category.budget_amount) > 0,
      );
      if (filter === "budgeted" && !hasBudget) return false;
      if (filter === "unbudgeted" && hasBudget) return false;
      if (!q) return true;
      return (
        category.name.toLowerCase().includes(q) ||
        (category.description || "").toLowerCase().includes(q)
      );
    });
  }, [categories, filter, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description || "",
      color: category.color || COLORS[0],
      icon: normalizeCategoryIcon(category.icon),
      budget_amount: category.budget_amount
        ? Number(category.budget_amount)
        : undefined,
      budget_period: category.budget_period || "MONTHLY",
    });
    setModalOpen(true);
  }

  function onNameChange(name: string) {
    const trimmed = name.trim();
    setForm((f) => ({
      ...f,
      name,
      icon: trimmed
        ? suggestCategoryIconHeuristic(trimmed, f.description || "")
        : "tags",
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: CreateCategoryInput = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        color: form.color,
        icon: normalizeCategoryIcon(form.icon),
        budget_amount: form.budget_amount
          ? Number(form.budget_amount)
          : undefined,
        budget_period: form.budget_amount ? form.budget_period : undefined,
      };
      if (editing) {
        await updateCategory(editing.id, payload);
      } else {
        await createCategory(payload);
      }
      showToast({
        title: editing ? "Category updated" : "Category created",
        description: "It is ready to use in transactions and budgets.",
        tone: "success",
      });
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save category"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Track spending envelopes with budgets, progress, and color coding."
        actions={
          <>
            <label className="flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-[10px] bg-[var(--ds-background-elevated)] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:flex-none">
              <Search
                size={14}
                className="text-[var(--ds-gray-700)]"
                aria-hidden
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search categories…"
                className="w-full bg-transparent text-xs text-[var(--ds-gray-1000)] outline-none placeholder:text-[var(--ds-gray-700)]"
                aria-label="Search categories"
              />
            </label>
            <div className="w-[148px] shrink-0">
              <Select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as FilterKind)
                }
                aria-label="Filter categories"
                className="h-9"
              >
                <option value="all">All types</option>
                <option value="budgeted">Budgeted</option>
                <option value="unbudgeted">No budget</option>
              </Select>
            </div>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus size={15} />
              New category
            </Button>
          </>
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      {loading ? (
        <CardGridSkeleton />
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            title="No categories"
            description="Create categories like Groceries, Rent, or Travel."
            actionLabel="New category"
            onAction={openCreate}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
              No matching categories
            </p>
            <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
              Try a different search or filter.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {visible.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              currency={currency}
              onEdit={() => openEdit(category)}
              onDelete={() => setDeleteTarget(category)}
            />
          ))}
        </div>
      )}

      {!loading && categories.length > 0 ? (
        <aside className="mt-6 flex items-start gap-3 rounded-[14px] bg-[color-mix(in_srgb,var(--ds-status-orange)_10%,var(--ds-background-elevated))] px-4 py-3 text-sm text-[var(--ds-gray-900)]">
          <Lightbulb
            size={18}
            className="mt-0.5 shrink-0 text-[var(--ds-status-orange)]"
            aria-hidden
          />
          <p className="min-w-0 leading-5">
            <span className="font-semibold text-[var(--ds-gray-1000)]">
              Tip:
            </span>{" "}
            Set a monthly budget on each category to see On Track / Near Limit
            status as you spend.{" "}
            <Link
              href="/budgets"
              className="font-medium text-[var(--ds-status-blue)] underline underline-offset-2"
            >
              Learn more
            </Link>
          </p>
        </aside>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit category" : "New category"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="category-form" type="submit" loading={saving}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <div className="mt-1">
              <CategoryNameWithIcon
                id="cat-name"
                required
                name={form.name}
                icon={normalizeCategoryIcon(form.icon) as CategoryIconId}
                color={form.color}
                showIcon={Boolean(form.name.trim())}
                onNameChange={onNameChange}
                onIconChange={(icon) => {
                  setForm((f) => ({ ...f, icon }));
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--ds-gray-700)]">
              Icon updates as you type. Click it to pick a different one before saving.
            </p>
          </div>
          <div>
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              value={form.description || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Color</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {COLORS.map((color) => {
                const selected = form.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Select color ${color}`}
                    aria-pressed={selected}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-full transition-transform ds-focus",
                      selected
                        ? "scale-105 ring-2 ring-[var(--ds-gray-1000)] ring-offset-2 ring-offset-[var(--ds-background-elevated)]"
                        : "hover:scale-105",
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {selected ? (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={form.budget_amount ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    budget_amount: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="period">Period</Label>
              <Select
                id="period"
                value={form.budget_period || "MONTHLY"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budget_period: e.target.value }))
                }
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete category?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. Existing transactions may prevent deletion.`
            : undefined
        }
        confirmLabel="Delete category"
        destructive
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteCategory(deleteTarget.id);
            setDeleteTarget(null);
            await refresh();
            showToast({
              title: "Category deleted",
              tone: "success",
            });
          } catch (err) {
            setError(getErrorMessage(err, "Could not delete category"));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
