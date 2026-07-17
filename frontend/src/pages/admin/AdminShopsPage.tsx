import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listShopsAdmin, updateShopStatus } from '../../api/admin';
import { Pagination } from '../../components/Pagination';
import type { ShopStatus } from '../../types/shop';

const statusOptions: { value: ShopStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'SUSPENDED', label: 'Tạm khóa' },
];

const statusStyles: Record<ShopStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-slate-200 text-slate-700',
};

export function AdminShopsPage() {
  const [status, setStatus] = useState<ShopStatus | ''>('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-shops', { status, page }],
    queryFn: () => listShopsAdmin({ status: status || undefined, page }),
  });

  const mutation = useMutation({
    mutationFn: (params: { id: string; status: ShopStatus }) =>
      updateShopStatus(params.id, params.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-shops'] }),
  });

  return (
    <div>
      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ShopStatus | '');
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {statusOptions.map((opt) => (
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
              <th className="py-2">Tên shop</th>
              <th>Chủ shop</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((shop) => (
              <tr key={shop.id} className="border-b border-slate-100">
                <td className="py-2">{shop.name}</td>
                <td>{shop.owner?.email}</td>
                <td>
                  <span className={`rounded px-2 py-0.5 ${statusStyles[shop.status]}`}>
                    {statusOptions.find((o) => o.value === shop.status)?.label}
                  </span>
                </td>
                <td className="flex justify-end gap-2 py-2 text-right">
                  {shop.status !== 'APPROVED' && (
                    <button
                      onClick={() => mutation.mutate({ id: shop.id, status: 'APPROVED' })}
                      className="rounded-md bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                    >
                      Duyệt
                    </button>
                  )}
                  {shop.status !== 'REJECTED' && shop.status === 'PENDING' && (
                    <button
                      onClick={() => mutation.mutate({ id: shop.id, status: 'REJECTED' })}
                      className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      Từ chối
                    </button>
                  )}
                  {shop.status === 'APPROVED' && (
                    <button
                      onClick={() => mutation.mutate({ id: shop.id, status: 'SUSPENDED' })}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                    >
                      Tạm khóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.items.length === 0 && (
        <p className="mt-4 text-center text-slate-400">Không có shop nào</p>
      )}
      {data && (
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
      )}
    </div>
  );
}
