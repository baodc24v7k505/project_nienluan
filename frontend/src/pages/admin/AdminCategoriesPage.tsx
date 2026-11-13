import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  listCategories,
} from "../../api/categories";

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      setParentId("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    try {
      await createMutation.mutateAsync({
        name,
        parentId: parentId || undefined,
      });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? "Tạo danh mục thất bại");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_1fr]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 surface p-4">
        <h2 className="text-sm font-semibold text-slate-900">Thêm danh mục</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên danh mục"
          required
          minLength={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Không có danh mục cha</option>
          {data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          className="rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Thêm danh mục
        </button>
      </form>

      <div>
        {isLoading ? (
          <p className="text-slate-500">Đang tải...</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Tên</th>
                <th>Slug</th>
                <th>Danh mục cha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2">{c.name}</td>
                  <td className="text-slate-400">{c.slug}</td>
                  <td>{data.find((p) => p.id === c.parentId)?.name ?? "-"}</td>
                  <td className="text-right">
                    <button
                      onClick={() => deleteMutation.mutate(c.id)}
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
      </div>
    </div>
  );
}
