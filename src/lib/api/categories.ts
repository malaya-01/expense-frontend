import { api, unwrap } from "./client";
import type { Category, CreateCategoryInput } from "@/types";
import { categoriesRepo } from "@/lib/offline/repos";

export async function listCategories(): Promise<Category[]> {
  return categoriesRepo.list() as Promise<Category[]>;
}

export async function createCategory(
  payload: CreateCategoryInput,
): Promise<Category> {
  return categoriesRepo.create(payload as any) as Promise<Category>;
}

export async function updateCategory(
  id: string,
  payload: Partial<CreateCategoryInput>,
): Promise<Category> {
  return categoriesRepo.update(id, payload as any) as Promise<Category>;
}

export async function deleteCategory(id: string): Promise<void> {
  await categoriesRepo.remove(id);
}

export async function listCategoryIcons(): Promise<Array<{ id: string }>> {
  const res = await api.get("/categories/icons");
  return unwrap(res);
}

export async function suggestCategoryIcon(payload: {
  name: string;
  description?: string;
}): Promise<{ icon: string; source: "ai" | "heuristic" }> {
  const res = await api.post("/ai/suggest-category-icon", payload);
  return unwrap(res);
}
