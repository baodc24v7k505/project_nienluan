import { apiClient } from "./client";
import type { Product, ProductStatus } from "../types/product";
import type { PaginatedResult } from "../types/shop";

export interface ListProductsParams {
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  shopId?: string;
  minPrice?: number;
  maxPrice?: number;
}

export async function listProducts(params: ListProductsParams) {
  const res = await apiClient.get<PaginatedResult<Product>>("/products", {
    params,
  });
  return res.data;
}

export async function getProduct(id: string) {
  const res = await apiClient.get<Product>(`/products/${id}`);
  return res.data;
}

export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
}

export async function suggestProducts(q: string) {
  const res = await apiClient.get<ProductSuggestion[]>(
    "/products/suggestions",
    { params: { q } },
  );
  return res.data;
}

export interface ProductPayload {
  variants?: { sku: string; name: string; price: number; stock: number }[];
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: string;
  status?: ProductStatus;
  images?: string[];
}

export async function listMyProducts(params: ListProductsParams) {
  const res = await apiClient.get<PaginatedResult<Product>>(
    "/seller/products",
    { params },
  );
  return res.data;
}

export async function createMyProduct(payload: ProductPayload) {
  const res = await apiClient.post<Product>("/seller/products", payload);
  return res.data;
}

export async function updateMyProduct(
  id: string,
  payload: Partial<ProductPayload>,
) {
  const res = await apiClient.patch<Product>(`/seller/products/${id}`, payload);
  return res.data;
}

export async function deleteMyProduct(id: string) {
  await apiClient.delete(`/seller/products/${id}`);
}

export async function updateProductStatusAdmin(
  id: string,
  status: ProductStatus,
) {
  const res = await apiClient.patch<Product>(`/admin/products/${id}/status`, {
    status,
  });
  return res.data;
}

export async function listProductsAdmin(params: ListProductsParams) {
  const res = await apiClient.get<PaginatedResult<Product>>("/admin/products", {
    params,
  });
  return res.data;
}
