import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PaginatedResult } from "../types/shop";
import type { DiscountType, Voucher } from "../types/voucher";
import type { VoucherPayload } from "../api/vouchers";
import { formatVnd } from "../lib/format";
const optionalNumber = z.preprocess(
  (v) => (typeof v === "number" && Number.isNaN(v) ? undefined : v),
  z.number().nonnegative().optional(),
);

const schema = z.object({
  code: z.string().min(3, "Mã tối thiểu 3 ký tự"),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().min(0, "Giá trị phải >= 0"),
  maxDiscountAmount: optionalNumber,
  minOrderAmount: optionalNumber,
  usageLimit: optionalNumber,
  perUserLimit: optionalNumber,
  startAt: z.string().min(1, "Chọn ngày bắt đầu"),
  endAt: z.string().min(1, "Chọn ngày kết thúc"),
});
type FormValues = z.infer<typeof schema>;

export function VoucherManager({
  title,
  queryKey,
  listFn,
  createFn,
  updateFn,
}: {
  title: string;
  queryKey: string;
  listFn: () => Promise<PaginatedResult<Voucher>>;
  createFn: (payload: VoucherPayload) => Promise<Voucher>;
  updateFn: (
    id: string,
    payload: { status: "ACTIVE" | "INACTIVE" },
  ) => Promise<Voucher>;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: listFn,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { discountType: "PERCENT" as DiscountType },
  });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      reset();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (params: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      updateFn(params.id, { status: params.status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await createMutation.mutateAsync({
        ...values,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
      });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? "Tạo voucher thất bại");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div>
          <input
            {...register("code")}
            placeholder="Mã voucher (VD: SALE20)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
          />
          {errors.code && (
            <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            {...register("discountType")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="PERCENT">Giảm theo %</option>
            <option value="FIXED">Giảm số tiền cố định</option>
          </select>
          <input
            {...register("discountValue", { valueAsNumber: true })}
            type="number"
            placeholder="Giá trị"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <input
          {...register("maxDiscountAmount", { valueAsNumber: true })}
          type="number"
          placeholder="Giảm tối đa (áp dụng cho %, tùy chọn)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          {...register("minOrderAmount", { valueAsNumber: true })}
          type="number"
          placeholder="Đơn hàng tối thiểu (tùy chọn)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            {...register("usageLimit", { valueAsNumber: true })}
            type="number"
            placeholder="Tổng lượt dùng"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            {...register("perUserLimit", { valueAsNumber: true })}
            type="number"
            placeholder="Lượt/khách"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500">Bắt đầu</label>
            <input
              {...register("startAt")}
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Kết thúc</label>
            <input
              {...register("endAt")}
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {(errors.startAt || errors.endAt) && (
          <p className="text-xs text-red-600">
            Vui lòng chọn đầy đủ ngày bắt đầu/kết thúc
          </p>
        )}
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Tạo voucher
        </button>
      </form>

      <div>
        {isLoading ? (
          <p className="text-slate-500">Đang tải...</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Mã</th>
                <th>Giảm giá</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((v) => (
                <tr key={v.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{v.code}</td>
                  <td>
                    {v.discountType === "PERCENT"
                      ? `${v.discountValue}%`
                      : formatVnd(v.discountValue)}
                  </td>
                  <td className="text-xs text-slate-500">
                    {new Date(v.startAt).toLocaleDateString("vi-VN")} -{" "}
                    {new Date(v.endAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td>
                    <span
                      className={
                        v.status === "ACTIVE"
                          ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-700"
                          : "rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600"
                      }
                    >
                      {v.status === "ACTIVE" ? "Đang chạy" : "Đã tắt"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: v.id,
                          status: v.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                        })
                      }
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                    >
                      {v.status === "ACTIVE" ? "Tắt" : "Bật lại"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.items.length === 0 && (
          <p className="mt-4 text-center text-slate-400">Chưa có voucher nào</p>
        )}
      </div>
    </div>
  );
}
