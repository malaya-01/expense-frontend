import { api, unwrap } from "./client";
import type { Category, CreateCategoryInput } from "@/types";

export async function listCategories(): Promise<Category[]> {
  const res = await api.get("/categories");
  const data = unwrap<Category[] | Category>(res);
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function createCategory(
  payload: CreateCategoryInput,
): Promise<Category> {
  const res = await api.post("/categories", payload);
  return unwrap<Category>(res);
}

export async function updateCategory(
  id: string,
  payload: Partial<CreateCategoryInput>,
): Promise<Category> {
  const res = await api.patch(`/categories/${id}`, payload);
  return unwrap<Category>(res);
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
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
