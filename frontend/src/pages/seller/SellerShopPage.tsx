import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createShop, getMyShop } from "../../api/shops";

const schema = z.object({
  name: z.string().min(2, "Tên shop tối thiểu 2 ký tự"),
  description: z.string().optional(),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const statusLabel: Record<string, string> = {
  PENDING: "Đang chờ admin duyệt",
  APPROVED: "Đã được duyệt — bạn có thể đăng sản phẩm",
  REJECTED: "Đã bị từ chối",
  SUSPENDED: "Đang bị tạm khóa",
};

export function SellerShopPage() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: shop, isLoading } = useQuery({
    queryKey: ["my-shop"],
    queryFn: getMyShop,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: createShop,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-shop"] }),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await createMutation.mutateAsync(values);
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? "Đăng ký shop thất bại");
    }
  }

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;

  if (shop) {
    return (
      <div className="max-w-md surface p-4">
        <h2 className="text-lg font-semibold text-slate-900">{shop.name}</h2>
        <p className="mt-1 text-sm text-slate-500">{shop.description}</p>
        <p className="mt-1 text-sm text-slate-500">{shop.address}</p>
        <p className="mt-3 text-sm font-medium text-slate-700">
          {statusLabel[shop.status]}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex max-w-md flex-col gap-3 surface p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">
        Đăng ký shop của bạn
      </h2>
      <div>
        <input
          {...register("name")}
          placeholder="Tên shop"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>
      <textarea
        {...register("description")}
        placeholder="Mô tả (tùy chọn)"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        {...register("address")}
        placeholder="Địa chỉ (tùy chọn)"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        Đăng ký shop
      </button>
    </form>
  );
}
