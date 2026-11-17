export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { fullName: string };
  variantName: string | null;
  imageUrls: string[];
}

export interface ReviewsResult {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  avgRating: number;
  summary: {
    total: number;
    avgRating: number;
    withImages: number;
    distribution: { rating: number; count: number }[];
  };
}
