export type AdStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface Advertisement {
  id: string;
  shopId: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  status: AdStatus;
  startAt: string;
  endAt: string;
  createdAt: string;
  shop?: { id: string; name: string };
}
