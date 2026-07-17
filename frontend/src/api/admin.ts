import { apiClient } from './client';
import type { User, Role } from '../types/auth';
import type { PaginatedResult, Shop, ShopStatus } from '../types/shop';

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function listUsers(params: ListParams & { role?: Role }) {
  const res = await apiClient.get<PaginatedResult<User>>('/admin/users', { params });
  return res.data;
}

export async function updateUserStatus(id: string, status: 'ACTIVE' | 'BANNED') {
  const res = await apiClient.patch<User>(`/admin/users/${id}/status`, { status });
  return res.data;
}

export async function listStaff(params: ListParams) {
  const res = await apiClient.get<PaginatedResult<User>>('/admin/staff', { params });
  return res.data;
}

export interface CreateStaffPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export async function createStaff(payload: CreateStaffPayload) {
  const res = await apiClient.post<User>('/admin/staff', payload);
  return res.data;
}

export async function deleteStaff(id: string) {
  await apiClient.delete(`/admin/staff/${id}`);
}

export async function listShopsAdmin(params: ListParams & { status?: ShopStatus }) {
  const res = await apiClient.get<PaginatedResult<Shop>>('/admin/shops', { params });
  return res.data;
}

export async function updateShopStatus(id: string, status: ShopStatus) {
  const res = await apiClient.patch<Shop>(`/admin/shops/${id}/status`, { status });
  return res.data;
}
