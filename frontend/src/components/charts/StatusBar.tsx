import { statusLabel } from '../../lib/orderStatus';
import type { ShopOrderStatus } from '../../types/order';

const SEGMENT_COLOR: Record<ShopOrderStatus, string> = {
  PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-blue-400',
  SHIPPING: 'bg-indigo-400',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-400',
  RETURNED: 'bg-slate-400',
};

const ORDER: ShopOrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
];

export function StatusBar({ data }: { data: Record<string, number> }) {
  const total = ORDER.reduce((sum, s) => sum + (data[s] ?? 0), 0);

  if (total === 0) {
    return <p className="text-sm text-slate-400">Chưa có dữ liệu</p>;
  }

  return (
    <div>
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
        {ORDER.map((status) => {
          const count = data[status] ?? 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={status}
              className={`${SEGMENT_COLOR[status]} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${pct}%` }}
              title={`${statusLabel[status]}: ${count}`}
            />
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {ORDER.map((status) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${SEGMENT_COLOR[status]}`} />
            <span>
              {statusLabel[status]}: <span className="tabular-nums font-medium">{data[status] ?? 0}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
