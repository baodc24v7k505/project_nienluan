import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSellerOrders, updateShopOrderStatus } from "../../api/orders";
import { formatVnd } from "../../lib/format";
import { statusLabel } from "../../lib/orderStatus";
import { CancelReasonModal } from "../../components/CancelReasonModal";
import type { ShopOrderStatus } from "../../types/order";
import { Pagination } from "../../components/Pagination";
import { OrderFulfillment } from "../../components/OrderFulfillment";

const nextStatus: Partial<Record<ShopOrderStatus, ShopOrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPING",
  SHIPPING: "DELIVERED",
};

export function SellerOrdersPage() {
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["seller-orders", page],
    queryFn: () => listSellerOrders(page),
  });

  const mutation = useMutation({
    mutationFn: (params: {
      id: string;
      status: ShopOrderStatus;
      reason?: string;
    }) => updateShopOrderStatus(params.id, params.status, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      setCancelTarget(null);
    },
  });

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;

  return (
    <div className="flex flex-col gap-4">
      {data?.items.map((so) => (
        <div key={so.id} className="surface p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
            <span>
              Khách hàng: {so.order?.customer.fullName} (
              {so.order?.customer.email})
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
              {statusLabel[so.status]}
            </span>
          </div>
          <p className="mb-2 text-xs text-slate-400">
            Giao tới: {so.order?.recipientName} — {so.order?.recipientPhone} —{" "}
            {so.order?.shippingAddress}
          </p>
          {so.orderItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-sm text-slate-600"
            >
              <span>
                {item.nameSnapshot} · {item.variantSnapshot} × {item.quantity}
              </span>
              <span>{formatVnd(Number(item.unitPrice) * item.quantity)}</span>
            </div>
          ))}
          {so.status === "CANCELLED" && so.cancelReason && (
            <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-500">
              Lý do hủy: {so.cancelReason}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-sm font-semibold">
              {formatVnd(so.subtotal)}
            </span>
            <div className="flex gap-2">
              {nextStatus[so.status] && (
                <button
                  onClick={() =>
                    mutation.mutate({
                      id: so.id,
                      status: nextStatus[so.status]!,
                    })
                  }
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
                >
                  Chuyển sang {statusLabel[nextStatus[so.status]!]}
                </button>
              )}
              {(so.status === "PENDING" || so.status === "CONFIRMED") && (
                <button
                  onClick={() => setCancelTarget(so.id)}
                  className="rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100"
                >
                  Hủy đơn
                </button>
              )}
            </div>
          </div>
          <OrderFulfillment order={so} mode="seller" />
        </div>
      ))}
      {data && data.items.length === 0 && (
        <p className="text-center text-slate-400">Chưa có đơn hàng nào</p>
      )}

      {cancelTarget && (
        <CancelReasonModal
          title="Hủy đơn hàng"
          isSubmitting={mutation.isPending}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) =>
            mutation.mutate({ id: cancelTarget, status: "CANCELLED", reason })
          }
        />
      )}
      {mutation.error && (
        <p className="text-red-600">
          {(mutation.error as any).response?.data?.message ??
            "Cập nhật thất bại"}
        </p>
      )}
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
