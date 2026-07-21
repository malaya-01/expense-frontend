"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardBody } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusDot } from "@/components/ui/status-dot";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/api/categories";
import { getErrorMessage } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton } from "@/components/ui/feedback";
import type { Category, CreateCategoryInput } from "@/types";

const COLORS = [
  "#0062D1",
  "#45A557",
  "#FF990A",
  "#E5484D",
  "#7820BC",
  "#067A6E",
  "#EA3E83",
  "#52AEFF",
];

const emptyForm: CreateCategoryInput = {
  name: "",
  description: "",
  color: COLORS[0],
  budget_amount: undefined,
  budget_period: "MONTHLY",
};

export default function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    refresh();
  }, [refresh]);

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
      budget_amount: category.budget_amount
        ? Number(category.budget_amount)
        : undefined,
      budget_period: category.budget_period || "MONTHLY",
    });
    setModalOpen(true);
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
        description="Organize spending with budgets and color markers."
        actions={<Button onClick={openCreate}>New category</Button>}
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardBody className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <StatusDot color={category.color || undefined} tone="blue" />
                    <div className="min-w-0">
                      <h2 className="truncate text-[var(--ds-gray-1000)]">
                        {category.name}
                      </h2>
                      {category.description ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--ds-gray-900)]">
                          {category.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                {category.budget_amount ? (
                  <p className="mt-4 text-xs text-[var(--ds-gray-700)]">
                    Budget{" "}
                    {formatCurrency(Number(category.budget_amount))}
                    {category.budget_period
                      ? ` / ${category.budget_period.toLowerCase()}`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-[var(--ds-gray-700)]">
                    No budget set
                  </p>
                )}
                <div className="mt-4 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(category)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--ds-status-red)]"
                    onClick={() => setDeleteTarget(category)}
                  >
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

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
            <Input
              id="cat-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
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
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Select ${color}`}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className="flex size-8 items-center justify-center rounded-[6px] hover:bg-[var(--ds-gray-100)] ds-focus"
                >
                  <StatusDot color={color} />
                  {form.color === color ? (
                    <span className="sr-only">Selected</span>
                  ) : null}
                </button>
              ))}
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
