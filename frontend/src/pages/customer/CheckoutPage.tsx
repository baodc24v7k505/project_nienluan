import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAddress, listAddresses } from "../../api/addresses";
import { checkout, quoteOrder, type CheckoutPayload } from "../../api/orders";
import { createMomoPayment } from "../../api/payments";
import { formatVnd } from "../../lib/format";
import type { Order, PaymentMethod } from "../../types/order";

export function CheckoutPage() {
  const location = useLocation(),
    navigate = useNavigate(),
    qc = useQueryClient();
  const selection = (location.state ?? {}) as Pick<
    CheckoutPayload,
    "directItem" | "cartItemIds"
  >;
  const [addressId, setAddressId] = useState(""),
    [paymentMethod, setMethod] = useState<PaymentMethod>("COD");
  const [voucherInput, setVoucherInput] = useState(""),
    [voucherCode, setVoucherCode] = useState("");
  const [key] = useState(() => crypto.randomUUID()),
    [created, setCreated] = useState<Order | null>(null),
    [error, setError] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: listAddresses,
  });
  useEffect(() => {
    if (!addressId && addresses?.length)
      setAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
  }, [addresses, addressId]);
  const payload: CheckoutPayload = {
    ...selection,
    addressId,
    paymentMethod,
    voucherCode: voucherCode || undefined,
    idempotencyKey: key,
  };
  const quote = useQuery({
    queryKey: ["checkout-quote", selection, voucherCode],
    queryFn: () => quoteOrder(payload),
    retry: false,
    enabled: !created,
  });
  const saveAddress = useMutation({
    mutationFn: createAddress,
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      setAddressId(a.id);
      setShowAddress(false);
    },
  });
  const place = useMutation({
    mutationFn: async () => {
      setError("");
      if (!addressId) throw new Error("Vui lòng chọn địa chỉ giao hàng");
      const order = created ?? (await checkout(payload));
      setCreated(order);
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      if (order.paymentMethod === "MOMO" && order.paymentStatus !== "PAID") {
        const { payUrl } = await createMomoPayment(order.id);
        window.location.assign(payUrl);
      } else navigate(`/orders/${order.id}`, { replace: true });
    },
    onError: (e: any) =>
      setError(e.response?.data?.message ?? e.message ?? "Không thể đặt hàng"),
  });
  const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm";
  return (
    <div>
      <h1 className="mb-5 text-2xl font-semibold">Xác nhận đặt hàng</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="surface p-4">
            <h2 className="mb-3 font-semibold">Địa chỉ giao hàng</h2>
            {addresses?.map((a) => (
              <label
                key={a.id}
                className="mb-2 flex gap-3 rounded border p-3 text-sm"
              >
                <input
                  disabled={!!created}
                  type="radio"
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                />
                <span>
                  {a.recipientName} · {a.phone}
                  <br />
                  {a.line}, {a.city}
                </span>
              </label>
            ))}
            <button
              disabled={!!created}
              className="text-sm text-brand"
              onClick={() => setShowAddress(!showAddress)}
            >
              + Thêm địa chỉ
            </button>
            {showAddress && (
              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  saveAddress.mutate({
                    recipientName: String(f.get("name")),
                    phone: String(f.get("phone")),
                    line: String(f.get("line")),
                    city: String(f.get("city")),
                    isDefault: !addresses?.length,
                  });
                }}
              >
                <input
                  className={inputClass}
                  name="name"
                  placeholder="Người nhận"
                  required
                  minLength={2}
                />
                <input
                  className={inputClass}
                  name="phone"
                  placeholder="Số điện thoại"
                  required
                  minLength={8}
                />
                <input
                  className={inputClass}
                  name="line"
                  placeholder="Số nhà, đường, phường/xã"
                  required
                  minLength={4}
                />
                <input
                  className={inputClass}
                  name="city"
                  placeholder="Tỉnh/thành phố"
                  required
                  minLength={2}
                />
                <button
                  disabled={saveAddress.isPending}
                  className="rounded bg-slate-900 px-4 py-2 text-white"
                >
                  Lưu địa chỉ
                </button>
                {saveAddress.error && (
                  <p className="text-red-600">Không lưu được địa chỉ</p>
                )}
              </form>
            )}
          </section>
          <section className="surface p-4">
            <h2 className="mb-3 font-semibold">Thanh toán</h2>
            {(["COD", "MOMO"] as const).map((m) => (
              <label key={m} className="mb-2 flex gap-2 rounded border p-3">
                <input
                  disabled={!!created}
                  type="radio"
                  checked={paymentMethod === m}
                  onChange={() => setMethod(m)}
                />
                {m === "COD" ? "Thanh toán khi nhận hàng" : "Ví MoMo (sandbox)"}
              </label>
            ))}
            <p className="text-xs text-slate-500">
              MoMo giữ hàng trong 30 phút. Đơn hết hạn được hủy và hoàn kho.
            </p>
          </section>
          <section className="surface p-4">
            <h2 className="mb-2 font-semibold">Giao hàng tiêu chuẩn</h2>
            <p className="text-sm text-slate-500">
              30.000đ mỗi shop; miễn phí khi tiền hàng của shop từ 500.000đ.
              Thời gian dự kiến 3–5 ngày, chưa kết nối hãng vận chuyển.
            </p>
          </section>
        </div>
        <section className="h-fit surface p-4">
          <h2 className="mb-4 font-semibold">Chi tiết thanh toán</h2>
          {quote.isLoading && <p>Đang tính giá...</p>}
          {quote.error && (
            <p className="mb-3 text-red-600">
              {(quote.error as any).response?.data?.message ??
                "Không tính được đơn hàng"}
            </p>
          )}
          {quote.data?.items.map((i, idx) => (
            <div key={i.id || idx} className="mb-3 text-sm">
              <p>
                {i.product.name} · {i.variant.name} × {i.quantity}
              </p>
              <p className="text-right">
                {formatVnd(Number(i.variant.price) * i.quantity)}
              </p>
            </div>
          ))}
          <div className="my-3 flex gap-2">
            <input
              aria-label="Mã giảm giá"
              disabled={!!created}
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value)}
              className={inputClass}
              placeholder="Mã giảm giá"
            />
            <button
              disabled={!!created}
              onClick={() => setVoucherCode(voucherInput.trim().toUpperCase())}
              className="whitespace-nowrap rounded bg-slate-100 px-3"
            >
              Áp dụng
            </button>
          </div>
          {voucherCode && (
            <button
              disabled={!!created}
              className="text-xs text-brand"
              onClick={() => {
                setVoucherCode("");
                setVoucherInput("");
              }}
            >
              Bỏ mã {voucherCode}
            </button>
          )}
          {quote.data && (
            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span>Tiền hàng</span>
                <span>{formatVnd(quote.data.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Giảm giá</span>
                <span>-{formatVnd(quote.data.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phí giao hàng</span>
                <span>{formatVnd(quote.data.shippingFee)}</span>
              </div>
              {quote.data.shops.map((s) => (
                <p key={s.shopId} className="text-xs text-slate-500">
                  {s.shopName}: phí giao {formatVnd(s.shippingFee)}
                </p>
              ))}
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-brand">
                  {formatVnd(created?.totalAmount ?? quote.data.totalAmount)}
                </span>
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {created && (
            <p className="mt-3 text-sm">
              Đơn đã được tạo.{" "}
              <Link
                className="text-brand underline"
                to={`/orders/${created.id}`}
              >
                Xem đơn và tiếp tục thanh toán
              </Link>
            </p>
          )}
          <button
            onClick={() => place.mutate()}
            disabled={
              place.isPending ||
              (!created &&
                (!quote.data || quote.isFetching || !!quote.error)) ||
              !addressId
            }
            className="mt-4 w-full rounded bg-brand py-3 text-white disabled:opacity-50"
          >
            {place.isPending
              ? "Đang xử lý..."
              : created
                ? "Thử lại thanh toán"
                : "Đặt hàng"}
          </button>
        </section>
      </div>
    </div>
  );
}
