import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  completeRefund,
  collectCod,
  requestReturn,
  resolveReturn,
  setShipping,
} from "../api/orders";
import type { ShopOrder } from "../types/order";
import { formatVnd } from "../lib/format";
import { statusLabel } from "../lib/orderStatus";
import { ImageUpload } from "./ImageUpload";

export function OrderFulfillment({
  order,
  mode,
}: {
  order: ShopOrder;
  mode: "customer" | "seller" | "admin" | "staff";
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState(""),
    [evidence, setEvidence] = useState<string[]>([]),
    [resolution, setResolution] = useState("");
  const [carrier, setCarrier] = useState(order.carrier ?? ""),
    [tracking, setTracking] = useState(order.trackingCode ?? ""),
    [reference, setReference] = useState("");
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      qc.invalidateQueries({ queryKey: ["seller-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
  const button =
    "rounded bg-slate-900 px-3 py-2 text-xs text-white disabled:opacity-50";
  const input = "w-full rounded border border-slate-300 px-3 py-2 text-sm";
  const request = order.returnRequest;
  const canReturn =
    mode === "customer" &&
    order.status === "DELIVERED" &&
    !request &&
    order.deliveredAt &&
    Date.now() - new Date(order.deliveredAt).getTime() <= 7 * 86400000;
  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm">
      {mode === 'seller' && order.status === 'DELIVERED' && order.order?.paymentMethod === 'COD' && Number(order.paidAmount) < Number(order.totalAmount) && <div className="rounded bg-amber-50 p-3 text-xs"><p>Đơn cũ đã giao nhưng chưa ghi nhận tiền COD. Chỉ xác nhận nếu đã thu tiền thực tế.</p><button disabled={mutation.isPending} className={button} onClick={() => mutation.mutate(() => collectCod(order.id))}>Xác nhận đã thu COD</button></div>}
      <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
        <span>Tiền hàng</span>
        <span className="text-right">{formatVnd(order.subtotal)}</span>
        <span>Giảm giá</span>
        <span className="text-right">-{formatVnd(order.discountAmount)}</span>
        <span>Giao hàng</span>
        <span className="text-right">{formatVnd(order.shippingFee)}</span>
        <span className="font-semibold">Phải thanh toán</span>
        <span className="text-right font-semibold">
          {formatVnd(order.totalAmount)}
        </span>
        <span>Đã thu</span>
        <span className="text-right">{formatVnd(order.paidAmount)}</span>
      </div>
      {order.carrier && (
        <p className="rounded bg-blue-50 p-2 text-xs">
          {order.carrier} · Vận đơn: <strong>{order.trackingCode}</strong>
        </p>
      )}
      {!!order.history?.length && (
        <details>
          <summary className="cursor-pointer text-xs text-brand">
            Lịch sử đơn hàng
          </summary>
          <ol className="mt-2 space-y-2 border-l-2 border-brand/30 pl-3">
            {order.history.map((h) => (
              <li key={h.id} className="text-xs">
                <strong>{statusLabel[h.status]}</strong>
                <span className="ml-2 text-slate-400">
                  {new Date(h.createdAt).toLocaleString("vi-VN")}
                </span>
                {h.note && <p className="text-slate-500">{h.note}</p>}
              </li>
            ))}
          </ol>
        </details>
      )}
      {mode === "seller" &&
        ["CONFIRMED", "SHIPPING"].includes(order.status) && (
          <form
            className="space-y-2 rounded bg-slate-50 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(() => setShipping(order.id, carrier, tracking));
            }}
          >
            <p className="text-xs font-medium">Thông tin vận chuyển</p>
            <input
              required
              minLength={2}
              className={input}
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Đơn vị vận chuyển"
            />
            <input
              required
              minLength={3}
              className={input}
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Mã vận đơn"
            />
            <button className={button} disabled={mutation.isPending}>
              Lưu vận đơn
            </button>
          </form>
        )}
      {canReturn && (
        <details>
          <summary className="cursor-pointer text-brand">
            Yêu cầu trả hàng (trong 7 ngày)
          </summary>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(() => requestReturn(order.id, reason, evidence));
            }}
          >
            <p className="text-xs text-slate-500">
              Yêu cầu áp dụng cho toàn bộ đơn của shop. Hàng được hoàn kho sau
              khi shop xác nhận nhận lại.
            </p>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              className={input}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mô tả lý do trả hàng"
            />
            {evidence.length < 5 && (
              <ImageUpload
                onUpload={(url) => setEvidence((rows) => [...rows, url])}
              />
            )}
            <div className="flex gap-2">
              {evidence.map((url) => (
                <button
                  type="button"
                  key={url}
                  title="Bỏ ảnh"
                  onClick={() =>
                    setEvidence((rows) => rows.filter((x) => x !== url))
                  }
                >
                  <img
                    alt="Bằng chứng"
                    src={url}
                    className="h-16 w-16 rounded object-cover"
                  />
                </button>
              ))}
            </div>
            <button className={button} disabled={mutation.isPending}>
              Gửi yêu cầu
            </button>
          </form>
        </details>
      )}
      {request && (
        <div className="space-y-2 rounded bg-amber-50 p-3">
          <p className="font-medium">
            Trả hàng:{" "}
            {
              {
                REQUESTED: "Chờ xử lý",
                APPROVED: "Được chấp thuận – chờ nhận hàng",
                REJECTED: "Đã từ chối",
                RECEIVED: "Đã nhận hàng trả lại",
              }[request.status]
            }
          </p>
          <p className="text-xs">Lý do: {request.reason}</p>
          {request.resolution && (
            <p className="text-xs">Phản hồi: {request.resolution}</p>
          )}
          <div className="flex gap-2">
            {request.evidenceUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt="Ảnh bằng chứng"
                  className="h-16 w-16 rounded object-cover"
                />
              </a>
            ))}
          </div>
          {(mode === "seller" || mode === "admin") &&
            [
              "REQUESTED",
              "APPROVED",
              ...(mode === "admin" ? ["REJECTED"] : []),
            ].includes(request.status) && (
              <div className="space-y-2">
                <textarea
                  minLength={3}
                  className={input}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Nhập phản hồi hoặc biên bản nhận hàng"
                />
                <div className="flex flex-wrap gap-2">
                  {(request.status === "APPROVED"
                    ? [{ status: "RECEIVED", label: "Đã nhận lại hàng" }]
                    : [
                        { status: "APPROVED", label: "Chấp thuận" },
                        ...(request.status === "REQUESTED"
                          ? [{ status: "REJECTED", label: "Từ chối" }]
                          : []),
                      ]
                  ).map((a) => (
                    <button
                      key={a.status}
                      className={button}
                      disabled={
                        mutation.isPending || resolution.trim().length < 3
                      }
                      onClick={() =>
                        mutation.mutate(() =>
                          resolveReturn(
                            order.id,
                            a.status,
                            resolution,
                            mode === "admin",
                          ),
                        )
                      }
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
      {order.refunds?.map((r) => (
        <div key={r.id} className="space-y-2 rounded bg-purple-50 p-3 text-xs">
          <p>
            Hoàn tiền {formatVnd(r.amount)} ·{" "}
            {r.status === "COMPLETED"
              ? "Đã xác nhận hoàn"
              : "Chờ hoàn tiền thủ công"}
          </p>
          <p>{r.reason}</p>
          {r.reference && <p>Mã đối chiếu: {r.reference}</p>}
          {mode === "admin" && r.status === "PENDING" && (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate(() => completeRefund(r.id, reference));
              }}
            >
              <p>
                Chỉ xác nhận sau khi đã chuyển tiền thực tế. Hệ thống chưa tự
                gọi API hoàn tiền.
              </p>
              <input
                required
                minLength={5}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={input}
                placeholder="Mã giao dịch/biên bản hoàn tiền"
              />
              <button className={button} disabled={mutation.isPending}>
                Xác nhận đã hoàn tiền
              </button>
            </form>
          )}
        </div>
      ))}
      {mutation.error && (
        <p className="text-xs text-red-600">
          {(mutation.error as any).response?.data?.message ??
            "Thao tác thất bại"}
        </p>
      )}
      {mutation.isSuccess && (
        <p className="text-xs text-green-700">Đã lưu cập nhật</p>
      )}
    </div>
  );
}
