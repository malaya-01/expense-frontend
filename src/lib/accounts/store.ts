import type {
  CreateContainerInput,
  FinancialContainer,
} from "@/types";
import { getContainerMeta } from "./types-meta";

const STORAGE_KEY = "finos:financial-containers";

function readAll(): FinancialContainer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FinancialContainer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: FinancialContainer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `acc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function listContainers(userId?: string): FinancialContainer[] {
  const all = readAll();
  if (!userId) return all;
  return all
    .filter((c) => c.user_id === userId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getContainer(id: string): FinancialContainer | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function createContainer(
  userId: string,
  input: CreateContainerInput,
): FinancialContainer {
  const now = new Date().toISOString();
  const meta = getContainerMeta(input.type);
  const container: FinancialContainer = {
    id: uid(),
    user_id: userId,
    name: input.name.trim(),
    type: input.type,
    balance: Number(input.balance) || 0,
    currency: (input.currency || "USD").toUpperCase().slice(0, 3),
    institution: input.institution?.trim() || null,
    color: input.color || meta.defaultColor,
    notes: input.notes?.trim() || null,
    include_in_net_worth: input.include_in_net_worth ?? true,
    created_at: now,
    updated_at: now,
  };
  const all = readAll();
  all.push(container);
  writeAll(all);
  return container;
}

export function updateContainer(
  id: string,
  input: Partial<CreateContainerInput>,
): FinancialContainer | null {
  const all = readAll();
  const index = all.findIndex((c) => c.id === id);
  if (index < 0) return null;
  const current = all[index];
  const updated: FinancialContainer = {
    ...current,
    name: input.name !== undefined ? input.name.trim() : current.name,
    type: input.type ?? current.type,
    balance:
      input.balance !== undefined ? Number(input.balance) : current.balance,
    currency: input.currency
      ? input.currency.toUpperCase().slice(0, 3)
      : current.currency,
    institution:
      input.institution !== undefined
        ? input.institution.trim() || null
        : current.institution,
    color: input.color ?? current.color,
    notes:
      input.notes !== undefined ? input.notes.trim() || null : current.notes,
    include_in_net_worth:
      input.include_in_net_worth ?? current.include_in_net_worth,
    updated_at: new Date().toISOString(),
  };
  all[index] = updated;
  writeAll(all);
  return updated;
}

export function deleteContainer(id: string): boolean {
  const all = readAll();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

export function adjustContainerBalance(
  id: string,
  delta: number,
): FinancialContainer | null {
  const current = getContainer(id);
  if (!current) return null;
  return updateContainer(id, { balance: current.balance + delta });
}
