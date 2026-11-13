import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listUsers, updateUserStatus } from "../../api/admin";
import { Pagination } from "../../components/Pagination";
import type { Role } from "../../types/auth";
import { useAuthStore } from "../../store/auth.store";

const roleOptions: { value: Role | ""; label: string }[] = [
  { value: "", label: "Tất cả vai trò" },
  { value: "CUSTOMER", label: "Khách hàng" },
  { value: "SELLER", label: "Người bán" },
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "STAFF", label: "Nhân viên" },
];

export function AdminUsersPage() {
  const currentRole = useAuthStore((s) => s.user?.role);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", { search, role, page }],
    queryFn: () =>
      listUsers({ search: search || undefined, role: role || undefined, page }),
  });

  const toggleStatus = useMutation({
    mutationFn: (params: { id: string; status: "ACTIVE" | "BANNED" }) =>
      updateUserStatus(params.id, params.status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo email hoặc tên..."
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | "");
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Email</th>
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2">{u.email}</td>
                <td>{u.fullName}</td>
                <td>{u.role}</td>
                <td>
                  <span
                    className={
                      u.status === "ACTIVE"
                        ? "rounded bg-green-100 px-2 py-0.5 text-green-700"
                        : "rounded bg-red-100 px-2 py-0.5 text-red-700"
                    }
                  >
                    {u.status === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>
                <td className="text-right">
                  {currentRole === "ADMIN" && u.role !== "ADMIN" && (
                    <button
                      onClick={() =>
                        toggleStatus.mutate({
                          id: u.id,
                          status: u.status === "ACTIVE" ? "BANNED" : "ACTIVE",
                        })
                      }
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                    >
                      {u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.items.length === 0 && (
        <p className="mt-4 text-center text-slate-400">
          Không có người dùng nào
        </p>
      )}
      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
