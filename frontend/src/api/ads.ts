import { apiClient } from "./client";
import type { Advertisement, AdStatus } from "../types/ad";
import type { PaginatedResult } from "../types/shop";

export interface AdPayload {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  startAt: string;
  endAt: string;
}

export async function getActiveAds() {
  const res = await apiClient.get<Advertisement[]>("/ads/active");
  return res.data;
}

export async function listSellerAds(page = 1) {
  const res = await apiClient.get<PaginatedResult<Advertisement>>(
    "/seller/ads",
    { params: { page } },
  );
  return res.data;
}

export async function createSellerAd(payload: AdPayload) {
  const res = await apiClient.post<Advertisement>("/seller/ads", payload);
  return res.data;
}

export async function listAdminAds(
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: AdStatus;
    deletionRequested?: "true" | "false";
  } = {},
) {
  const res = await apiClient.get<PaginatedResult<Advertisement>>(
    "/admin/ads",
    { params },
  );
  return res.data;
}
export async function deleteAd(id: string) {
  return (await apiClient.delete(`/admin/ads/${id}`)).data;
}
export async function requestAdDeletion(id: string, reason: string) {
  return (
    await apiClient.post(`/seller/ads/${id}/deletion-request`, { reason })
  ).data;
}
export async function cancelAdDeletion(id: string) {
  return (await apiClient.delete(`/seller/ads/${id}/deletion-request`)).data;
}
export async function rejectAdDeletion(id: string, note: string) {
  return (await apiClient.patch(`/admin/ads/${id}/deletion-request`, { note }))
    .data;
}

export async function updateAdStatus(id: string, status: AdStatus) {
  const res = await apiClient.patch<Advertisement>(`/admin/ads/${id}/status`, {
    status,
  });
  return res.data;
}
