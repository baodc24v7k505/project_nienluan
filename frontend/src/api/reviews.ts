import { apiClient } from "./client";
import type { Review, ReviewsResult } from "../types/review";

export async function listProductReviews(
  productId: string,
  page = 1,
  options: {
    rating?: number;
    withImages?: "true";
    sort?: "newest" | "oldest";
    pageSize?: number;
  } = {},
) {
  const res = await apiClient.get<ReviewsResult>(
    `/products/${productId}/reviews`,
    { params: { page, ...options } },
  );
  return res.data;
}

export async function createReview(payload: {
  orderItemId: string;
  rating: number;
  comment?: string;
  imageIds?: string[];
}) {
  const res = await apiClient.post<Review>("/reviews", payload);
  return res.data;
}
