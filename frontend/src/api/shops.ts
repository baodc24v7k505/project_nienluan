import { apiClient } from './client';
import type { PublicShop, Shop } from '../types/shop';
import type { Voucher } from '../types/voucher';

export interface ShopPayload {
  name: string;
  description?: string;
  address?: string;
}

export async function getMyShop() {
  const res = await apiClient.get<Shop>('/shops/me');
  return res.data;
}

export async function createShop(payload: ShopPayload) {
  const res = await apiClient.post<Shop>('/shops', payload);
  return res.data;
}

export async function updateMyShop(payload: Partial<ShopPayload>) {
  const res = await apiClient.patch<Shop>('/shops/me', payload);
  return res.data;
}

export async function getPublicShop(id: string) {
  const res = await apiClient.get<PublicShop>(`/shops/${id}`);
  return res.data;
}

export async function listShopVouchers(id: string) {
  const res = await apiClient.get<Voucher[]>(`/shops/${id}/vouchers`);
  return res.data;
}
