export type NotificationType =
  | 'ORDER_STATUS_CHANGED'
  | 'NEW_MESSAGE'
  | 'SHOP_STATUS_CHANGED'
  | 'NEW_ORDER'
  | 'VOUCHER_NEW'
  | 'AD_STATUS_CHANGED';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResult {
  items: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}
