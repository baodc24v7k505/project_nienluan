export interface Review {
  id: string;
  productId: string;
  customerId: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { id: string; fullName: string };
}

export interface ReviewsResult {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  avgRating: number;
}
