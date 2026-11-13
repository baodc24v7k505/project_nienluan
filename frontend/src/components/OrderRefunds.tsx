import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeRefund } from "../api/orders";
import { formatVnd } from "../lib/format";
import type { Refund } from "../types/order";
export function OrderRefunds({
  refunds,
  admin = false,
}: {
  refunds: Refund[];
  admin?: boolean;
}) {
  const qc = useQueryClient(),
    [reference, setReference] = useState("");
  const mutation = useMutation({
    mutationFn: (id: string) => completeRefund(id, reference),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
    },
  });
  return (
    <>
      {refunds
        .filter((r) => !r.shopOrderId)
        .map((r) => (
          <div
            key={r.id}
            className="my-3 space-y-2 rounded bg-purple-50 p-3 text-xs"
          >
            <p>
              Khoản hoàn cấp đơn: {formatVnd(r.amount)} ·{" "}
              {r.status === "COMPLETED" ? "Đã xác nhận" : "Chờ hoàn thủ công"}
            </p>
            <p>{r.reason}</p>
            {r.reference && <p>Mã đối chiếu: {r.reference}</p>}
            {admin && r.status === "PENDING" && (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate(r.id);
                }}
              >
                <p>Chỉ xác nhận khi đã chuyển tiền thực tế.</p>
                <input
                  required
                  minLength={5}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Mã giao dịch hoàn tiền"
                  className="rounded border p-2"
                />
                <button
                  disabled={mutation.isPending}
                  className="ml-2 rounded bg-slate-900 p-2 text-white"
                >
                  Xác nhận hoàn tiền
                </button>
              </form>
            )}
          </div>
        ))}
      {mutation.error && (
        <p className="text-xs text-red-600">Không thể xác nhận khoản hoàn</p>
      )}
    </>
  );
}
