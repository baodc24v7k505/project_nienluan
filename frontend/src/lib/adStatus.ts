import type { AdStatus } from "../types/ad";
export const adLabels: Record<AdStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  EXPIRED: "Đã hết hạn",
};
export const adColors: Record<AdStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  EXPIRED: "bg-slate-100 text-slate-500",
};
export const adDate = (date: string) =>
  new Date(date).toLocaleDateString("vi-VN");
