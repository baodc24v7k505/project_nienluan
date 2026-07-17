import { apiClient } from './client';
import type { NotificationsResult } from '../types/notification';

export async function listNotifications() {
  const res = await apiClient.get<NotificationsResult>('/notifications');
  return res.data;
}

export async function markNotificationRead(id: string) {
  const res = await apiClient.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await apiClient.patch('/notifications/read-all');
  return res.data;
}
