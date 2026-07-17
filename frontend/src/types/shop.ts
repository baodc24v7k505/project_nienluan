export type ShopStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  address: string | null;
  status: ShopStatus;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; email: string; fullName: string };
}

export interface PublicShop extends Shop {
  productCount: number;
  avgRating: number;
  reviewCount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
