import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSellerAd, listSellerAds } from '../../api/ads';

const schema = z.object({
  title: z.string().min(3, 'Tiêu đề tối thiểu 3 ký tự'),
  imageUrl: z.string().url('URL ảnh không hợp lệ'),
  linkUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  startAt: z.string().min(1, 'Chọn ngày bắt đầu'),
  endAt: z.string().min(1, 'Chọn ngày kết thúc'),
});
type FormValues = z.infer<typeof schema>;

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

export function SellerAdsPage() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['seller-ads'], queryFn: listSellerAds });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: createSellerAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-ads'] });
      reset();
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await createMutation.mutateAsync({
        ...values,
        linkUrl: values.linkUrl || undefined,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
      });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Gửi quảng cáo thất bại');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900">Gửi banner quảng cáo</h2>
        <p className="text-xs text-slate-400">
          Banner sẽ hiển thị ở trang chủ sau khi được Admin duyệt.
        </p>
        <div>
          <input
            {...register('title')}
            placeholder="Tiêu đề quảng cáo"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>
        <div>
          <input
            {...register('imageUrl')}
            placeholder="URL ảnh banner (VD: https://placehold.co/800x300)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.imageUrl && (
            <p className="mt-1 text-xs text-red-600">{errors.imageUrl.message}</p>
          )}
        </div>
        <div>
          <input
            {...register('linkUrl')}
            placeholder="Link đích khi bấm vào (tùy chọn)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.linkUrl && <p className="mt-1 text-xs text-red-600">{errors.linkUrl.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500">Bắt đầu</label>
            <input
              {...register('startAt')}
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Kết thúc</label>
            <input
              {...register('endAt')}
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {(errors.startAt || errors.endAt) && (
          <p className="text-xs text-red-600">Vui lòng chọn đầy đủ ngày bắt đầu/kết thúc</p>
        )}
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Gửi duyệt
        </button>
      </form>

      <div>
        {isLoading ? (
          <p className="text-slate-500">Đang tải...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data?.items.map((ad) => (
              <div key={ad.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <img src={ad.imageUrl} alt={ad.title} className="mb-2 h-32 w-full rounded-md object-cover" />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">{ad.title}</p>
                  <span className={`rounded px-2 py-0.5 text-xs ${statusStyles[ad.status]}`}>
                    {statusLabel[ad.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(ad.startAt).toLocaleDateString('vi-VN')} -{' '}
                  {new Date(ad.endAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ))}
            {data && data.items.length === 0 && (
              <p className="text-center text-slate-400">Chưa có quảng cáo nào</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
