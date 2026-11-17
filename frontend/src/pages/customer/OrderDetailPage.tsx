import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelOrder, getMyOrder } from "../../api/orders";
import { formatVnd } from "../../lib/format";
import { statusLabel, statusStyles } from "../../lib/orderStatus";
import { CancelReasonModal } from "../../components/CancelReasonModal";
import type { ShopOrderStatus } from "../../types/order";
import { OrderFulfillment } from "../../components/OrderFulfillment";
import { createMomoPayment } from "../../api/payments";
import { OrderRefunds } from "../../components/OrderRefunds";

import { ReviewComposer } from "../../components/ReviewComposer";

const CANCELLABLE: ShopOrderStatus[] = ["PENDING", "CONFIRMED"];

const cancelledByLabel: Record<string, string> = {
  CUSTOMER: "Bạn đã hủy đơn này",
  SELLER: "Người bán đã hủy đơn này",
  ADMIN: "Quản trị viên đã hủy đơn này",
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const pay = useMutation({
    mutationFn: async () => {
      const { payUrl } = await createMomoPayment(id!);
      window.location.assign(payUrl);
    },
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getMyOrder(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: (params: { shopOrderId: string; reason: string }) =>
      cancelOrder(params.shopOrderId, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      setCancelTarget(null);
    },
  });

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;
  if (!order) return <p className="text-slate-500">Không tìm thấy đơn hàng</p>;

  return (
    <div>
      <Link to="/orders" className="text-sm text-brand hover:underline">
        ← Quay lại danh sách đơn hàng
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold text-slate-900">
        Chi tiết đơn hàng #{order.id.slice(0, 8)}
      </h1>

      <div className="mb-4 surface p-4 text-sm">
        <p>
          <span className="text-slate-500">Người nhận:</span>{" "}
          {order.recipientName} — {order.recipientPhone}
        </p>
        <p className="mt-1">
          <span className="text-slate-500">Địa chỉ giao hàng:</span>{" "}
          {order.shippingAddress}
        </p>
        <p className="mt-1">
          <span className="text-slate-500">Ngày đặt:</span>{" "}
          {new Date(order.createdAt).toLocaleString("vi-VN")}
        </p>
        <p className="mt-1">
          <span className="text-slate-500">Thanh toán:</span>{" "}
          {order.paymentMethod} —{" "}
          {order.paymentStatus === "PAID"
            ? "Đã thanh toán"
            : order.paymentStatus === "REFUNDED"
              ? "Đã hoàn tiền"
              : order.paymentStatus === "PARTIALLY_REFUNDED"
                ? "Đã hoàn một phần"
                : order.paymentStatus === "FAILED"
                  ? "Thất bại"
                  : "Chưa thanh toán"}
        </p>
      </div>

      {order.paymentMethod === "MOMO" &&
        ["PENDING", "FAILED"].includes(order.paymentStatus) &&
        order.shopOrders.every((s) => s.status === "PENDING") && (
          <div className="mb-4 surface p-4">
            <p className="mb-2 text-sm">
              {order.expiresAt
                ? `Hạn thanh toán: ${new Date(order.expiresAt).toLocaleString("vi-VN")}`
                : "Đơn đang chờ thanh toán"}
            </p>
            <button
              disabled={pay.isPending}
              className="rounded bg-brand px-4 py-2 text-white"
              onClick={() => pay.mutate()}
            >
              Tiếp tục thanh toán MoMo
            </button>
            {pay.error && (
              <p className="mt-2 text-red-600">
                {(pay.error as any).response?.data?.message ??
                  "Không tạo được giao dịch"}
              </p>
            )}
          </div>
        )}
      <div className="flex flex-col gap-4">
        {order.shopOrders.map((so) => (
          <div key={so.id} className="surface p-4">
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
              <div key={item.id} className="my-2 rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-600">
                  <span>
                    {item.nameSnapshot} · {item.variantSnapshot} ×{" "}
                    {item.quantity}
                  </span>
                  <span>
                    {formatVnd(Number(item.unitPrice) * item.quantity)}
                  </span>
                </div>
                {so.status === "DELIVERED" && <ReviewComposer item={item} />}
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-sm font-semibold">
                {formatVnd(so.subtotal)}
              </span>
              {CANCELLABLE.includes(so.status) && (
                <button
                  onClick={() => setCancelTarget(so.id)}
                  className="rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100"
                >
                  Hủy đơn
                </button>
              )}
            </div>
            {so.status === "CANCELLED" && so.cancelReason && (
              <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-500">
                <p>
                  {so.cancelledBy ? cancelledByLabel[so.cancelledBy] : "Đã hủy"}
                </p>
                <p className="mt-0.5">Lý do: {so.cancelReason}</p>
              </div>
            )}
            <OrderFulfillment order={so} mode="customer" />
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between surface p-4 text-base font-semibold">
        <span>Tổng tiền lúc đặt</span>
        <span className="text-brand">{formatVnd(order.totalAmount)}</span>
      </div>

      {cancelTarget && (
        <CancelReasonModal
          title="Hủy đơn hàng"
          isSubmitting={cancelMutation.isPending}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) =>
            cancelMutation.mutate({ shopOrderId: cancelTarget, reason })
          }
        />
      )}
      <OrderRefunds refunds={order.refunds} />
    </div>
  );
}
