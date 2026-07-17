import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAdminAds, updateAdStatus } from '../../api/ads';
import type { AdStatus } from '../../types/ad';

const statusLabel: Record<string, string> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  EXPIRED: 'Đã hết hạn',
};

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-slate-200 text-slate-600',
};

export function AdminAdsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-ads'], queryFn: listAdminAds });

  const mutation = useMutation({
    mutationFn: (params: { id: string; status: AdStatus }) =>
      updateAdStatus(params.id, params.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ads'] }),
  });

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data?.items.map((ad) => (
        <div key={ad.id} className="rounded-lg border border-slate-200 bg-white p-3">
          <img src={ad.imageUrl} alt={ad.title} className="mb-2 h-32 w-full rounded-md object-cover" />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">{ad.title}</p>
            <span className={`rounded px-2 py-0.5 text-xs ${statusStyles[ad.status]}`}>
              {statusLabel[ad.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Shop: {ad.shop?.name}</p>
          <p className="mt-1 text-xs text-slate-400">
            {new Date(ad.startAt).toLocaleDateString('vi-VN')} -{' '}
            {new Date(ad.endAt).toLocaleDateString('vi-VN')}
          </p>
          {ad.status === 'PENDING' && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => mutation.mutate({ id: ad.id, status: 'APPROVED' })}
                className="flex-1 rounded-md bg-green-50 px-2 py-1.5 text-xs text-green-700 hover:bg-green-100"
              >
                Duyệt
              </button>
              <button
                onClick={() => mutation.mutate({ id: ad.id, status: 'REJECTED' })}
                className="flex-1 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100"
              >
                Từ chối
              </button>
            </div>
          )}
        </div>
      ))}
      {data && data.items.length === 0 && (
        <p className="text-center text-slate-400">Chưa có quảng cáo nào</p>
      )}
    </div>
  );
}
