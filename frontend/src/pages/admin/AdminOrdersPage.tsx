import { useQuery } from '@tanstack/react-query';
import { listAdminOrders } from '../../api/orders';
import { formatVnd } from '../../lib/format';
import { statusLabel } from '../../lib/orderStatus';

export function AdminOrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-orders'], queryFn: listAdminOrders });

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;

  return (
    <div className="flex flex-col gap-4">
      {data?.items.map((order) => (
        <div key={order.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
            <span>Mã đơn: {order.id.slice(0, 8)}</span>
            <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
          </div>
          {order.shopOrders.map((so) => (
            <div key={so.id} className="mb-2 flex items-center justify-between text-sm">
              <span>
                {so.shop.name} — {so.orderItems.length} sản phẩm
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                {statusLabel[so.status]}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold">
            <span>Tổng cộng ({order.paymentMethod})</span>
            <span className="text-red-600">{formatVnd(order.totalAmount)}</span>
          </div>
        </div>
      ))}
      {data && data.items.length === 0 && (
        <p className="text-center text-slate-400">Chưa có đơn hàng nào</p>
      )}
    </div>
  );
}
