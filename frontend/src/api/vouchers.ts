import { apiClient } from './client';
import type { Voucher, VoucherApplication, DiscountType } from '../types/voucher';
import type { PaginatedResult } from '../types/shop';

export interface VoucherPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startAt: string;
  endAt: string;
}

export async function listSellerVouchers() {
  const res = await apiClient.get<PaginatedResult<Voucher>>('/seller/vouchers');
  return res.data;
}

export async function createSellerVoucher(payload: VoucherPayload) {
  const res = await apiClient.post<Voucher>('/seller/vouchers', payload);
  return res.data;
}

export async function updateSellerVoucher(id: string, payload: { status: 'ACTIVE' | 'INACTIVE' }) {
  const res = await apiClient.patch<Voucher>(`/seller/vouchers/${id}`, payload);
  return res.data;
}

export async function listAdminVouchers() {
  const res = await apiClient.get<PaginatedResult<Voucher>>('/admin/vouchers');
  return res.data;
}

export async function createAdminVoucher(payload: VoucherPayload) {
  const res = await apiClient.post<Voucher>('/admin/vouchers', payload);
  return res.data;
}

export async function updateAdminVoucher(id: string, payload: { status: 'ACTIVE' | 'INACTIVE' }) {
  const res = await apiClient.patch<Voucher>(`/admin/vouchers/${id}`, payload);
  return res.data;
}

export async function validateVoucher(code: string) {
  const res = await apiClient.post<VoucherApplication>('/vouchers/validate', { code });
  return res.data;
}
