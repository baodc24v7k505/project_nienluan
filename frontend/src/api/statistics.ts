import { apiClient } from "./client";
import type { AdminStatistics, SellerStatistics } from "../types/statistics";

export async function getSellerStatistics(
  days?: number,
  range: { from?: string; to?: string } = {},
) {
  const res = await apiClient.get<SellerStatistics>("/seller/statistics", {
    params: { days, ...range },
  });
  return res.data;
}

export async function getAdminStatistics(
  days?: number,
  range: { from?: string; to?: string } = {},
) {
  const res = await apiClient.get<AdminStatistics>("/admin/statistics", {
    params: { days, ...range },
  });
  return res.data;
}
