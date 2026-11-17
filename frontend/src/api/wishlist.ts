import { apiClient } from "./client";
import type { Product } from "../types/product";
import type { PaginatedResult } from "../types/shop";
export async function wishlistIds() {
  return (await apiClient.get<{ ids: string[] }>("/wishlist/ids")).data.ids;
}
export async function listWishlist(page: number) {
  return (
    await apiClient.get<PaginatedResult<Product>>("/wishlist", {
      params: { page, pageSize: 12 },
    })
  ).data;
}
export async function saveWishlist(productId: string, saved: boolean) {
  return saved
    ? apiClient.post(`/wishlist/${productId}`)
    : apiClient.delete(`/wishlist/${productId}`);
}
