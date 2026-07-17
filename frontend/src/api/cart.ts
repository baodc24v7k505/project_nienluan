import { apiClient } from './client';
import type { Cart } from '../types/order';

export async function getCart() {
  const res = await apiClient.get<Cart>('/cart');
  return res.data;
}

export async function addToCart(productId: string, quantity: number) {
  const res = await apiClient.post('/cart', { productId, quantity });
  return res.data;
}

export async function updateCartItem(productId: string, quantity: number) {
  const res = await apiClient.patch(`/cart/${productId}`, { quantity });
  return res.data;
}

export async function removeCartItem(productId: string) {
  await apiClient.delete(`/cart/${productId}`);
}
