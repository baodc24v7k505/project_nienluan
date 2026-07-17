import { apiClient } from './client';
import type { Order, PaymentMethod, ShopOrder, ShopOrderStatus } from '../types/order';
import type { PaginatedResult } from '../types/shop';

export async function checkout(addressId: string, paymentMethod: PaymentMethod, voucherCode?: string) {
  const res = await apiClient.post<Order>('/orders', { addressId, paymentMethod, voucherCode });
  return res.data;
}

export async function listMyOrders() {
  const res = await apiClient.get<PaginatedResult<Order>>('/orders');
  return res.data;
}

export async function getMyOrder(id: string) {
  const res = await apiClient.get<Order>(`/orders/${id}`);
  return res.data;
}

export async function listSellerOrders() {
  const res = await apiClient.get<PaginatedResult<ShopOrder>>('/seller/orders');
  return res.data;
}

export async function updateShopOrderStatus(id: string, status: ShopOrderStatus, reason?: string) {
  const res = await apiClient.patch<ShopOrder>(`/seller/orders/${id}/status`, { status, reason });
  return res.data;
}

export async function listAdminOrders() {
  const res = await apiClient.get<PaginatedResult<Order>>('/admin/orders');
  return res.data;
}

export async function cancelOrder(shopOrderId: string, reason: string) {
  const res = await apiClient.patch<ShopOrder>(`/orders/shop-orders/${shopOrderId}/cancel`, {
    reason,
  });
  return res.data;
}
