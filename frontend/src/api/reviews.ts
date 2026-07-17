import { apiClient } from './client';
import type { Review, ReviewsResult } from '../types/review';

export async function listProductReviews(productId: string) {
  const res = await apiClient.get<ReviewsResult>(`/products/${productId}/reviews`);
  return res.data;
}

export async function createReview(payload: {
  orderItemId: string;
  rating: number;
  comment?: string;
}) {
  const res = await apiClient.post<Review>('/reviews', payload);
  return res.data;
}
