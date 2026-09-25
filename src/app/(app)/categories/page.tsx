"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Lightbulb,
  Layers,
  PiggyBank,
  Plus,
  Search,
  Check,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/ui/page-header";
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
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton } from "@/components/ui/feedback";
import { CategoryNameWithIcon } from "@/components/categories/category-icon-picker";
import { cn } from "@/lib/cn";
import {
  normalizeCategoryIcon,
  suggestCategoryIconHeuristic,
  type CategoryIconId,
} from "@/lib/categories/icons";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { formatCurrency } from "@/lib/format";
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

const FILTER_CHIPS: Array<{ id: FilterKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "budgeted", label: "Budgeted" },
  { id: "unbudgeted", label: "No budget" },
];

export default function CategoriesPage() {
  const perms = useModulePermissions("categories");
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

  const stats = useMemo(() => {
    let overBudget = 0;
    let totalSpent = 0;
    let totalBudget = 0;
    for (const category of categories) {
      const spent = Number(category.spent_amount || 0);
      const budget = Number(category.budget_amount || 0);
      totalSpent += spent;
      if (budget > 0) {
        totalBudget += budget;
        if (spent > budget) overBudget += 1;
      }
    }
    return {
      total: categories.length,
      overBudget,
      totalSpent,
      totalBudget,
    };
  }, [categories]);

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

  const list = useInfiniteList(visible, {
    pageSize: 20,
    resetKey: `${search}|${filter}`,
  });

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
      <div className="mb-3 sm:mb-5">
        <div className="min-w-0">
          <h1 className="font-heading text-[22px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[28px]">
            Categories
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-[var(--ds-gray-700)] sm:text-sm">
            Track spending envelopes with budget, progress, and color coding.
          </p>
        </div>

        <div className="mt-0 flex items-center gap-2 sm:mt-3">
          <div className="min-w-0 flex-1">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              aria-label="Search categories"
              startAdornment={<Search size={14} aria-hidden />}
              className="h-10"
            />
          </div>
          {perms.create ? (
            <div className="shrink-0">
              <Button onClick={openCreate} className="h-10 gap-1 px-3 text-[12px] sm:px-4 sm:text-[13px]">
                <Plus size={15} />
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New category</span>
              </Button>
            </div>
          ) : null}
        </div>

        {!loading && categories.length > 0 ? (
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_CHIPS.map((chip) => {
              const active = filter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)]"
                      : "bg-[var(--ds-background-elevated)] text-[var(--ds-gray-900)] ds-border",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {!loading && categories.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 sm:grid-cols-4">
          {[
            {
              label: "Categories",
              value: String(stats.total),
              icon: Layers,
            },
            {
              label: "Over budget",
              value: String(stats.overBudget),
              icon: AlertTriangle,
              danger: stats.overBudget > 0,
            },
            {
              label: "Spent",
              value: formatCurrency(stats.totalSpent, currency),
              icon: Wallet,
            },
            {
              label: "Budget",
              value: formatCurrency(stats.totalBudget, currency),
              icon: PiggyBank,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[12px] bg-[var(--ds-background-elevated)] px-2.5 py-2 ds-border sm:px-3 sm:py-2.5"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--ds-gray-700)]">
                <item.icon size={12} aria-hidden />
                <span className="truncate">{item.label}</span>
              </div>
              <p
                className={cn(
                  "mt-1 truncate text-[14px] font-semibold tabular-nums sm:text-[15px]",
                  item.danger
                    ? "text-[var(--ds-status-red)]"
                    : "text-[var(--ds-gray-1000)]",
                )}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

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
            actionLabel={perms.create ? "New category" : undefined}
            onAction={perms.create ? openCreate : undefined}
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
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
            {list.items.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                currency={currency}
                onEdit={perms.update ? () => openEdit(category) : undefined}
                onDelete={
                  perms.delete ? () => setDeleteTarget(category) : undefined
                }
              />
            ))}
          </div>
          <InfiniteScrollSentinel
            hasMore={list.hasMore}
            loading={list.loadingMore}
            onLoadMore={list.loadMore}
          />
        </>
      )}

      {!loading && categories.length > 0 ? (
        <aside className="mt-4 flex items-start gap-3 rounded-[14px] bg-[color-mix(in_srgb,var(--ds-status-orange)_10%,var(--ds-background-elevated))] px-3 py-2.5 text-sm text-[var(--ds-gray-900)] sm:mt-6 sm:px-4 sm:py-3">
          <Lightbulb
            size={16}
            className="mt-0.5 shrink-0 text-[var(--ds-status-orange)]"
            aria-hidden
          />
          <p className="min-w-0 text-[12px] leading-5 sm:text-sm">
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
              Icon updates as you type. Click it to pick a different one before
              saving.
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
