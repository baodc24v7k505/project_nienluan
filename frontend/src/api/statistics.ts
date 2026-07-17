import { apiClient } from './client';
import type { AdminStatistics, SellerStatistics } from '../types/statistics';

export async function getSellerStatistics(days?: number) {
  const res = await apiClient.get<SellerStatistics>('/seller/statistics', { params: { days } });
  return res.data;
}

export async function getAdminStatistics(days?: number) {
  const res = await apiClient.get<AdminStatistics>('/admin/statistics', { params: { days } });
  return res.data;
}
