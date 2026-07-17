import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProductsAdmin, updateProductStatusAdmin } from '../../api/products';
import { formatVnd } from '../../lib/format';
import type { ProductStatus } from '../../types/product';

const statusLabel: Record<ProductStatus, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang bán',
  HIDDEN: 'Đã ẩn',
};

export function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', { search }],
    queryFn: () => listProductsAdmin({ search: search || undefined, pageSize: 50 }),
  });

  const mutation = useMutation({
    mutationFn: (params: { id: string; status: ProductStatus }) =>
      updateProductStatusAdmin(params.id, params.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  return (
    <div>
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm sản phẩm..."
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {isLoading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Sản phẩm</th>
              <th>Gian hàng</th>
              <th>Giá</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-2">{p.name}</td>
                <td>{p.shop.name}</td>
                <td>{formatVnd(p.price)}</td>
                <td>{statusLabel[p.status]}</td>
                <td className="text-right">
                  {p.status !== 'HIDDEN' ? (
                    <button
                      onClick={() => mutation.mutate({ id: p.id, status: 'HIDDEN' })}
                      className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      Ẩn
                    </button>
                  ) : (
                    <button
                      onClick={() => mutation.mutate({ id: p.id, status: 'ACTIVE' })}
                      className="rounded-md bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                    >
                      Hiện lại
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
