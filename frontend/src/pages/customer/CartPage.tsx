import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, removeCartItem, updateCartItem } from '../../api/cart';
import { formatVnd } from '../../lib/format';

export function CartPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({ queryKey: ['cart'], queryFn: getCart });

  const updateMutation = useMutation({
    mutationFn: (params: { productId: string; quantity: number }) =>
      updateCartItem(params.productId, params.quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;

  if (!data || data.items.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500">
        <p>Giỏ hàng của bạn đang trống</p>
        <Link to="/" className="mt-2 inline-block text-slate-900 underline">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Giỏ hàng</h1>
      <div className="flex flex-col gap-3">
        {data.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-3"
          >
            <img
              src={item.product.images[0]?.url ?? 'https://placehold.co/100x100'}
              alt={item.product.name}
              className="h-16 w-16 rounded-md object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{item.product.name}</p>
              <p className="text-xs text-slate-400">{item.product.shop.name}</p>
              <p className="mt-1 text-sm font-semibold text-brand">
                {formatVnd(item.product.price)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateMutation.mutate({
                    productId: item.productId,
                    quantity: Math.max(1, item.quantity - 1),
                  })
                }
                className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    productId: item.productId,
                    quantity: item.quantity + 1,
                  })
                }
                className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                +
              </button>
            </div>
            <button
              onClick={() => removeMutation.mutate(item.productId)}
              className="text-xs text-red-600 hover:underline"
            >
              Xóa
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <span className="text-sm text-slate-600">Tổng cộng</span>
        <span className="text-xl font-bold text-brand">{formatVnd(data.total)}</span>
      </div>
      <button
        onClick={() => navigate('/checkout')}
        className="mt-4 w-full rounded-md bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark sm:w-auto sm:px-8"
      >
        Tiến hành thanh toán
      </button>
    </div>
  );
}
