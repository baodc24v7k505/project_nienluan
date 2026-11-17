import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { listMyOrders } from "../../api/orders";
import { ReviewComposer } from "../../components/ReviewComposer";
import { formatVnd } from "../../lib/format";
import { statusLabel, statusStyles } from "../../lib/orderStatus";
import { Pagination } from "../../components/Pagination";

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
          <div key={order.id} className="surface p-4">
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
              <div key={so.id} className="mb-3 rounded-xl bg-slate-50 p-4">
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
                      <ReviewComposer item={item} />
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div className="flex justify-between pt-2 text-sm font-semibold">
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
