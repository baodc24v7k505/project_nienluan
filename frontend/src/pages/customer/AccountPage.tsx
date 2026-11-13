import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { createAddress, listAddresses } from "../../api/addresses";
import { useAuthStore } from "../../store/auth.store";
import type { User } from "../../types/auth";
import type { Address } from "../../types/order";

export function AccountPage() {
  const user = useAuthStore((s) => s.user)!,
    qc = useQueryClient(),
    navigate = useNavigate();
  const [editing, setEditing] = useState<Address | null>(null),
    [showForm, setShowForm] = useState(false);
  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: listAddresses,
    enabled: user.role === "CUSTOMER",
  });
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
  const input = "w-full rounded border border-slate-300 px-3 py-2 text-sm",
    button =
      "rounded bg-brand px-4 py-2 text-sm text-white disabled:opacity-50";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Tài khoản của tôi</h1>
      <form
        className="space-y-3 surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          mutation.mutate(async () => {
            const { data } = await apiClient.patch<User>("/auth/profile", {
              fullName: f.get("fullName"),
              phone: f.get("phone"),
            });
            useAuthStore
              .getState()
              .setAuth(data, useAuthStore.getState().accessToken!);
          });
        }}
      >
        <h2 className="font-semibold">Thông tin cá nhân</h2>
        <p className="text-sm text-slate-500">{user.email}</p>
        <label className="block text-sm">
          Họ và tên
          <input
            name="fullName"
            className={input}
            defaultValue={user.fullName}
            required
            minLength={2}
          />
        </label>
        <label className="block text-sm">
          Điện thoại
          <input
            name="phone"
            className={input}
            defaultValue={user.phone ?? ""}
          />
        </label>
        <button className={button} disabled={mutation.isPending}>
          Lưu thông tin
        </button>
      </form>
      <form
        className="space-y-3 surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          mutation.mutate(async () => {
            await apiClient.post("/auth/password", {
              currentPassword: f.get("current"),
              newPassword: f.get("new"),
            });
            useAuthStore.getState().clearAuth();
            navigate("/login");
          });
        }}
      >
        <h2 className="font-semibold">Đổi mật khẩu</h2>
        <input
          aria-label="Mật khẩu hiện tại"
          type="password"
          name="current"
          autoComplete="current-password"
          required
          className={input}
          placeholder="Mật khẩu hiện tại"
        />
        <input
          aria-label="Mật khẩu mới"
          type="password"
          name="new"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          className={input}
          placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
        />
        <p className="text-xs text-slate-500">
          Sau khi đổi mật khẩu, các phiên đăng nhập cũ sẽ hết hiệu lực.
        </p>
        <button className={button} disabled={mutation.isPending}>
          Đổi mật khẩu
        </button>
      </form>
      {user.role === "CUSTOMER" && (
        <section className="space-y-3 surface p-5">
          <h2 className="font-semibold">Sổ địa chỉ</h2>
          {addresses?.map((a) => (
            <div key={a.id} className="rounded border p-3 text-sm">
              <p>
                {a.recipientName} · {a.phone}{" "}
                {a.isDefault && <span className="text-brand">· Mặc định</span>}
              </p>
              <p className="text-slate-500">
                {a.line}, {a.city}
              </p>
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => {
                    setEditing(a);
                    setShowForm(true);
                  }}
                  className="text-brand"
                >
                  Sửa
                </button>
                <button
                  onClick={() =>
                    mutation.mutate(() =>
                      apiClient.delete(`/addresses/${a.id}`),
                    )
                  }
                  className="text-red-600"
                >
                  Xóa
                </button>
                {!a.isDefault && (
                  <button
                    onClick={() =>
                      mutation.mutate(() =>
                        apiClient.patch(`/addresses/${a.id}`, {
                          isDefault: true,
                        }),
                      )
                    }
                  >
                    Đặt mặc định
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            className="text-brand"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + Thêm địa chỉ
          </button>
          {showForm && (
            <form
              key={editing?.id ?? "new"}
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const payload = {
                  recipientName: String(f.get("recipientName")),
                  phone: String(f.get("phone")),
                  line: String(f.get("line")),
                  city: String(f.get("city")),
                };
                mutation.mutate(async () => {
                  if (editing)
                    await apiClient.patch(`/addresses/${editing.id}`, payload);
                  else await createAddress(payload);
                  setShowForm(false);
                });
              }}
            >
              {(["recipientName", "phone", "line", "city"] as const).map(
                (field) => (
                  <input
                    key={field}
                    name={field}
                    defaultValue={editing?.[field] ?? ""}
                    required
                    minLength={field === "phone" ? 8 : field === "line" ? 4 : 2}
                    className={input}
                    placeholder={
                      {
                        recipientName: "Người nhận",
                        phone: "Điện thoại",
                        line: "Số nhà, đường, phường/xã",
                        city: "Tỉnh/thành phố",
                      }[field]
                    }
                  />
                ),
              )}
              <button className={button} disabled={mutation.isPending}>
                Lưu địa chỉ
              </button>
            </form>
          )}
        </section>
      )}
      {mutation.error && (
        <p className="text-red-600">
          {(mutation.error as any).response?.data?.message ??
            "Thao tác thất bại"}
        </p>
      )}
      {mutation.isSuccess && <p className="text-green-700">Đã cập nhật</p>}
    </div>
  );
}
