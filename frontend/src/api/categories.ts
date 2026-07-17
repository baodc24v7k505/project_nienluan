import { apiClient } from './client';
import type { Category } from '../types/product';

export async function listCategories() {
  const res = await apiClient.get<Category[]>('/categories');
  return res.data;
}

export async function createCategory(payload: { name: string; parentId?: string }) {
  const res = await apiClient.post<Category>('/categories', payload);
  return res.data;
}

export async function deleteCategory(id: string) {
  await apiClient.delete(`/categories/${id}`);
}
