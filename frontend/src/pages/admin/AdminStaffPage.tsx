import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createStaff, deleteStaff, listStaff } from "../../api/admin";

const schema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => listStaff({}),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] }),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await createMutation.mutateAsync(values);
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? "Tạo nhân viên thất bại");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_1fr]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3 surface p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          Thêm nhân viên mới
        </h2>
        <div>
          <input
            {...register("fullName")}
            placeholder="Họ và tên"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-600">
              {errors.fullName.message}
            </p>
          )}
        </div>
        <div>
          <input
            {...register("email")}
            placeholder="Email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <input
            {...register("phone")}
            placeholder="Số điện thoại (tùy chọn)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="Mật khẩu"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Thêm nhân viên
        </button>
      </form>

      <div>
        {isLoading ? (
          <p className="text-slate-500">Đang tải...</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Email</th>
                <th>Họ tên</th>
                <th>SĐT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-2">{s.email}</td>
                  <td>{s.fullName}</td>
                  <td>{s.phone ?? "-"}</td>
                  <td className="text-right">
                    <button
                      onClick={() => deleteMutation.mutate(s.id)}
                      className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.items.length === 0 && (
          <p className="mt-4 text-center text-slate-400">
            Chưa có nhân viên nào
          </p>
        )}
      </div>
    </div>
  );
}
