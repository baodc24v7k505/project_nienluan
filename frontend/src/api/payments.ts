import { apiClient } from './client';

export async function createMomoPayment(orderId: string) {
  const res = await apiClient.post<{ payUrl: string }>('/payments/momo/create', { orderId });
  return res.data;
}

export async function confirmMomoCallback(params: Record<string, string>) {
  const res = await apiClient.post<{ success: boolean; orderId: string; message?: string }>(
    '/payments/momo/confirm',
    params,
  );
  return res.data;
}
