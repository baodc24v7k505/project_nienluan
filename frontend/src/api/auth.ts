import { apiClient } from './client';
import type { LoginResponse, User } from '../types/auth';

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: 'CUSTOMER' | 'SELLER';
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const res = await apiClient.post<User>('/auth/register', payload);
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function fetchMe(): Promise<User> {
  const res = await apiClient.get<User>('/auth/me');
  return res.data;
}
