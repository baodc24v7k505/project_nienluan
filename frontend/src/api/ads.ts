import { apiClient } from './client';
import type { Advertisement, AdStatus } from '../types/ad';
import type { PaginatedResult } from '../types/shop';

export interface AdPayload {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  startAt: string;
  endAt: string;
}

export async function getActiveAds() {
  const res = await apiClient.get<Advertisement[]>('/ads/active');
  return res.data;
}

export async function listSellerAds() {
  const res = await apiClient.get<PaginatedResult<Advertisement>>('/seller/ads');
  return res.data;
}

export async function createSellerAd(payload: AdPayload) {
  const res = await apiClient.post<Advertisement>('/seller/ads', payload);
  return res.data;
}

export async function listAdminAds() {
  const res = await apiClient.get<PaginatedResult<Advertisement>>('/admin/ads');
  return res.data;
}

export async function updateAdStatus(id: string, status: AdStatus) {
  const res = await apiClient.patch<Advertisement>(`/admin/ads/${id}/status`, { status });
  return res.data;
}
