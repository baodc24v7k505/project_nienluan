import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReview } from "../api/reviews";
import { apiClient } from "../api/client";
import { Dialog } from "./Dialog";
import type { OrderItemLine } from "../types/order";

export function ReviewComposer({ item }: { item: OrderItemLine }) {
  const [open, setOpen] = useState(false),
    [rating, setRating] = useState(5),
    [comment, setComment] = useState("");
  const [images, setImages] = useState<{ id: string; url: string }[]>([]),
    [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState("");
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      setOpen(false);
      for (const key of [
        "order",
        "my-orders",
        "product-reviews",
        "products",
        "shop",
      ])
        qc.invalidateQueries({ queryKey: [key] });
    },
  });
  const existing = item.reviews?.[0];
  if (existing || mutation.isSuccess)
    return (
      <p className="mt-2 text-xs text-emerald-700">
        <i className="fas fa-circle-check mr-1" aria-hidden="true" />
        Đã đánh giá{existing ? ` · ${existing.rating}/5 sao` : ". Cảm ơn bạn!"}
      </p>
    );
  const busy = uploading || mutation.isPending;
  async function upload(files: File[]) {
    setUploadError("");
    if (files.length + images.length > 5) {
      setUploadError("Mỗi đánh giá tối đa 5 ảnh.");
      return;
    }
    if (
      files.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 2 * 1024 * 1024,
      )
    ) {
      setUploadError("Chọn ảnh JPEG, PNG hoặc WebP, mỗi ảnh tối đa 2MB.");
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const { data } = await apiClient.post<{ id: string; url: string }>(
          "/media",
          form,
        );
        setImages((previous) => [...previous, data]);
      }
    } catch {
      setUploadError(
        "Một số ảnh chưa tải được. Các ảnh tải thành công đã được giữ lại, bạn có thể thử thêm ảnh còn thiếu.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <>
      <button
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-bg px-3 py-2 text-xs font-semibold text-brand"
        onClick={() => setOpen(true)}
      >
        <i className="far fa-star" aria-hidden="true" />
        Đánh giá sản phẩm
      </button>
      {open && (
        <Dialog
          title="Chia sẻ trải nghiệm của bạn"
          onClose={() => setOpen(false)}
          busy={busy}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy)
                mutation.mutate({
                  orderItemId: item.id,
                  rating,
                  comment: comment.trim() || undefined,
                  imageIds: images.map((image) => image.id),
                });
            }}
          >
            <p className="text-sm font-medium">{item.nameSnapshot}</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.variantSnapshot} · Đã nhận hàng
            </p>
            <fieldset disabled={busy} className="mt-5">
              <legend className="text-xs font-semibold">Mức độ hài lòng</legend>
              <div
                role="group"
                aria-label="Chọn số sao"
                className="mt-2 flex gap-1"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    aria-label={`${star} sao`}
                    aria-pressed={rating === star}
                    onClick={() => setRating(star)}
                    className={`h-11 w-11 rounded-xl text-3xl ${star <= rating ? "text-amber-500" : "text-slate-200"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {
                  [
                    "",
                    "Rất không hài lòng",
                    "Chưa hài lòng",
                    "Bình thường",
                    "Hài lòng",
                    "Rất hài lòng",
                  ][rating]
                }
              </p>
            </fieldset>
            <label className="mt-5 block text-xs font-semibold">
              Nhận xét của bạn{" "}
              <span className="font-normal text-slate-400">(tùy chọn)</span>
              <textarea
                disabled={busy}
                aria-label="Nhận xét của bạn"
                maxLength={2000}
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chất lượng, cách đóng gói hoặc trải nghiệm sử dụng…"
                className="field mt-2 resize-y"
              />
            </label>
            <p className="mt-1 text-right text-[10px] text-slate-400">
              {comment.length}/2000
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold">
                Ảnh thực tế{" "}
                <span className="font-normal text-slate-400">
                  ({images.length}/5)
                </span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                JPEG, PNG, WebP · Tối đa 2MB/ảnh. Chỉ đăng ảnh sản phẩm, tránh
                thông tin cá nhân.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((image, i) => (
                  <div key={image.id} className="relative">
                    <img
                      src={image.url}
                      alt={`Ảnh đánh giá ${i + 1}`}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Xóa ảnh ${i + 1}`}
                      onClick={() =>
                        setImages((current) =>
                          current.filter((v) => v.id !== image.id),
                        )
                      }
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {images.length < 5 && (
                <label
                  className={`btn btn-secondary mt-3 cursor-pointer text-xs ${busy ? "opacity-50" : ""}`}
                >
                  <i className="fas fa-camera" aria-hidden="true" />
                  {uploading ? "Đang tải ảnh…" : "Thêm ảnh"}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Thêm ảnh đánh giá"
                    className="sr-only"
                    disabled={busy}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      if (files.length) void upload(files);
                    }}
                  />
                </label>
              )}
              {uploading && (
                <p role="status" className="mt-2 text-xs text-slate-500">
                  Đang tải ảnh, vui lòng đợi trước khi gửi đánh giá.
                </p>
              )}
              {uploadError && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  {uploadError}
                </p>
              )}
            </div>
            {mutation.error && (
              <p role="alert" className="mt-3 text-xs text-red-600">
                {(mutation.error as any).response?.data?.message ??
                  "Chưa gửi được đánh giá. Nội dung và ảnh đã được giữ lại để thử lại."}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="btn btn-secondary"
              >
                Để sau
              </button>
              <button disabled={busy} className="btn btn-primary">
                {mutation.isPending ? "Đang gửi…" : "Gửi đánh giá"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
