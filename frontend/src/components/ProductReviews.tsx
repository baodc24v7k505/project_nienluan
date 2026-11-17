import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProductReviews } from "../api/reviews";
import { Pagination } from "./Pagination";
import { ImageViewer } from "./ImageViewer";

export function ProductReviews({ productId }: { productId: string }) {
  const [page, setPage] = useState(1),
    [rating, setRating] = useState<number>(),
    [withImages, setWithImages] = useState(false),
    [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [viewer, setViewer] = useState<{ images: string[]; index: number }>();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [
      "product-reviews",
      productId,
      { page, rating, withImages, sort },
    ],
    queryFn: () =>
      listProductReviews(productId, page, {
        rating,
        withImages: withImages ? "true" : undefined,
        sort,
        pageSize: 8,
      }),
    placeholderData: keepPreviousData,
  });
  if (isLoading)
    return (
      <p role="status" className="muted py-8">
        Đang tải đánh giá…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="py-8 text-center">
        <p className="muted">Chưa tải được đánh giá.</p>
        <button className="btn btn-secondary mt-3" onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  if (!data) return null;
  const summary = data.summary;
  return (
    <div aria-busy={isFetching}>
      <div className="grid gap-6 rounded-2xl bg-slate-50 p-5 sm:grid-cols-[180px_1fr]">
        <div>
          <span className="text-4xl font-semibold">
            {summary.avgRating.toFixed(1)}
          </span>
          <span className="ml-1 text-sm text-slate-400">/ 5</span>
          <p
            className="mt-2 text-amber-500"
            aria-label={`${summary.avgRating.toFixed(1)} trên 5 sao`}
          >
            {"★".repeat(Math.round(summary.avgRating))}
            {"☆".repeat(5 - Math.round(summary.avgRating))}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {summary.total} đánh giá từ người mua
          </p>
        </div>
        <div className="space-y-2">
          {summary.distribution.map((group) => (
            <button
              key={group.rating}
              onClick={() => {
                setRating(group.rating);
                setPage(1);
              }}
              aria-label={`Lọc đánh giá ${group.rating} sao`}
              className="flex w-full items-center gap-3 text-xs"
            >
              <span className="w-8 shrink-0 text-slate-600">
                {group.rating} ★
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{
                    width: `${summary.total ? (group.count / summary.total) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="w-7 text-right text-slate-500">
                {group.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="my-5 flex flex-wrap items-center gap-2">
        <button
          aria-pressed={!rating}
          onClick={() => {
            setRating(undefined);
            setPage(1);
          }}
          className={`rounded-full px-4 py-2 text-xs ${!rating ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Tất cả
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            aria-pressed={rating === star}
            onClick={() => {
              setRating(star);
              setPage(1);
            }}
            className={`rounded-full px-3 py-2 text-xs ${rating === star ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {star} sao
          </button>
        ))}
        <label className="ml-1 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={withImages}
            onChange={(e) => {
              setWithImages(e.target.checked);
              setPage(1);
            }}
            className="accent-orange-600"
          />
          Có hình ảnh ({summary.withImages})
        </label>
        <select
          aria-label="Sắp xếp đánh giá"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as typeof sort);
            setPage(1);
          }}
          className="ml-auto rounded-lg bg-slate-100 px-3 py-2 text-xs"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
        </select>
      </div>
      <p role="status" className="mb-4 text-xs text-slate-400">
        {isFetching ? "Đang cập nhật…" : `${data.total} đánh giá phù hợp`}
      </p>
      {data.items.length ? (
        <div className="space-y-7">
          {data.items.map((review) => (
            <article key={review.id} className="flex min-w-0 gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                {review.customer.fullName[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-xs font-semibold">
                    {review.customer.fullName}
                  </p>
                  <span className="text-[10px] text-emerald-600">
                    <i
                      className="fas fa-circle-check mr-1"
                      aria-hidden="true"
                    />
                    Đã mua hàng
                  </span>
                </div>
                <p
                  className="mt-1 text-xs text-amber-500"
                  aria-label={`${review.rating} trên 5 sao`}
                >
                  {"★".repeat(review.rating)}
                  <span className="ml-3 text-[10px] text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </p>
                {review.variantName && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Phân loại: {review.variantName}
                  </p>
                )}
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {review.comment || "Khách hàng không để lại nhận xét."}
                </p>
                {!!review.imageUrls.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.imageUrls.map((url, index) => (
                      <button
                        key={url}
                        onClick={() =>
                          setViewer({ images: review.imageUrls, index })
                        }
                        aria-label={`Xem ảnh đánh giá ${index + 1} của ${review.customer.fullName}`}
                        className="h-20 w-20 overflow-hidden rounded-xl bg-slate-100"
                      >
                        <img
                          loading="lazy"
                          src={url}
                          alt={`Ảnh sản phẩm do ${review.customer.fullName} chia sẻ`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center">
          <i
            className="far fa-star text-3xl text-slate-200"
            aria-hidden="true"
          />
          <p className="muted mt-3">
            {summary.total
              ? "Chưa có đánh giá phù hợp bộ lọc."
              : "Chưa có đánh giá. Bạn có thể chia sẻ trải nghiệm sau khi nhận hàng."}
          </p>
          {summary.total > 0 && (
            <button
              className="btn btn-secondary mt-4"
              onClick={() => {
                setRating(undefined);
                setWithImages(false);
                setPage(1);
              }}
            >
              Xóa bộ lọc đánh giá
            </button>
          )}
        </div>
      )}
      <Pagination
        page={page}
        pageSize={data.pageSize}
        total={data.total}
        onPageChange={setPage}
      />
      {viewer && (
        <ImageViewer
          images={viewer.images}
          initialIndex={viewer.index}
          onClose={() => setViewer(undefined)}
        />
      )}
    </div>
  );
}
