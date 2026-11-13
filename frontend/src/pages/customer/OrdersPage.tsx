import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { listMyOrders } from "../../api/orders";
import { createReview } from "../../api/reviews";
import { formatVnd } from "../../lib/format";
import { statusLabel, statusStyles } from "../../lib/orderStatus";
import { Pagination } from "../../components/Pagination";

function ReviewWidget({ orderItemId }: { orderItemId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const mutation = useMutation({ mutationFn: createReview });

  if (mutation.isSuccess) {
    return <p className="text-xs text-green-600">Cảm ơn bạn đã đánh giá!</p>;
  }

  if (mutation.isError && (mutation.error as any)?.response?.status === 409) {
    return (
      <p className="text-xs text-slate-400">Bạn đã đánh giá sản phẩm này</p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-900 underline"
      >
        Đánh giá sản phẩm
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-1 rounded-md bg-slate-50 p-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={star <= rating ? "text-amber-500" : "text-slate-300"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Nhận xét (tùy chọn)"
        className="rounded border border-slate-300 px-2 py-1 text-xs"
      />
      {mutation.isError &&
        (mutation.error as any)?.response?.status !== 409 && (
          <p className="text-xs text-red-600">
            {(mutation.error as any)?.response?.data?.message ??
              "Gửi đánh giá thất bại"}
          </p>
        )}
      <div className="flex gap-2">
        <button
          onClick={() =>
            mutation.mutate({
              orderItemId,
              rating,
              comment: comment || undefined,
            })
          }
          disabled={mutation.isPending}
          className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-700"
        >
          Gửi
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get("justPlaced");
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", page],
    queryFn: () => listMyOrders(page),
  });

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">
        Đơn hàng của tôi
      </h1>
      {justPlaced && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Đặt hàng thành công! Mã đơn: {justPlaced}
        </div>
      )}
      {data && data.items.length === 0 && (
        <p className="text-slate-400">Bạn chưa có đơn hàng nào</p>
      )}
      <div className="flex flex-col gap-4">
        {data?.items.map((order) => (
          <div
            key={order.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
              <span>Mã đơn: {order.id.slice(0, 8)}</span>
              <span>{new Date(order.createdAt).toLocaleString("vi-VN")}</span>
            </div>
            <Link
              to={`/orders/${order.id}`}
              className="mb-2 inline-block text-sm text-brand hover:underline"
            >
              Xem chi tiết →
            </Link>
            {order.shopOrders.map((so) => (
              <div
                key={so.id}
                className="mb-3 rounded-md border border-slate-100 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">
                    {so.shop.name}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${statusStyles[so.status]}`}
                  >
                    {statusLabel[so.status]}
                  </span>
                </div>
                {so.orderItems.map((item) => (
                  <div key={item.id} className="mb-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>
                        {item.nameSnapshot} · {item.variantSnapshot} ×{" "}
                        {item.quantity}
                      </span>
                      <span>
                        {formatVnd(Number(item.unitPrice) * item.quantity)}
                      </span>
                    </div>
                    {so.status === "DELIVERED" && (
                      <ReviewWidget orderItemId={item.id} />
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
              <span>Tổng cộng ({order.paymentMethod})</span>
              <span className="text-brand">{formatVnd(order.totalAmount)}</span>
            </div>
          </div>
        ))}
      </div>
      {data && (
        <Pagination
          page={page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
