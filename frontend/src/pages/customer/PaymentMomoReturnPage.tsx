import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmMomoCallback } from "../../api/payments";

type Status = "checking" | "success" | "failed";

export function PaymentMomoReturnPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (!params.orderId) {
      setStatus("failed");
      setMessage("Thiếu thông tin giao dịch");
      return;
    }

    confirmMomoCallback(params)
      .then((res) => {
        setOrderId(res.orderId);
        setStatus(res.success ? "success" : "failed");
        setMessage(res.message ?? "");
      })
      .catch((err) => {
        setStatus("failed");
        setMessage(
          err?.response?.data?.message ?? "Xác nhận thanh toán thất bại",
        );
      });
  }, [searchParams]);

  return (
    <div className="mx-auto mt-16 max-w-md surface p-8 text-center">
      {status === "checking" && (
        <p className="text-slate-500">Đang xác nhận thanh toán...</p>
      )}
      {status === "success" && (
        <>
          <p className="text-lg font-semibold text-green-700">
            Thanh toán thành công!
          </p>
          {orderId && (
            <p className="mt-1 text-sm text-slate-500">Mã đơn: {orderId}</p>
          )}
        </>
      )}
      {status === "failed" && (
        <>
          <p className="text-lg font-semibold text-red-600">
            Thanh toán không thành công
          </p>
          {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
        </>
      )}
      <Link to="/orders" className="mt-4 inline-block text-slate-900 underline">
        Xem đơn hàng của tôi
      </Link>
    </div>
  );
}
