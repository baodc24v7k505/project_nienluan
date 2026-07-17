import { apiClient } from './client';
import type { Address } from '../types/order';

export async function listAddresses() {
  const res = await apiClient.get<Address[]>('/addresses');
  return res.data;
}

export interface AddressPayload {
  recipientName: string;
  phone: string;
  line: string;
  city: string;
  isDefault?: boolean;
}

export async function createAddress(payload: AddressPayload) {
  const res = await apiClient.post<Address>('/addresses', payload);
  return res.data;
}
