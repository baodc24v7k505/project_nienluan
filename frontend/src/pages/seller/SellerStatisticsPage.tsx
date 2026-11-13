import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSellerStatistics } from "../../api/statistics";
import { StatTile } from "../../components/StatTile";
import { RevenueBarChart } from "../../components/charts/RevenueBarChart";
import { StatusBar } from "../../components/charts/StatusBar";
import { ReportControls } from "../../components/ReportControls";
import { formatVnd } from "../../lib/format";

export function SellerStatisticsPage() {
  const [days, setDays] = useState(14);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const { data, isLoading } = useQuery({
    queryKey: ["seller-statistics", days, range],
    queryFn: () => getSellerStatistics(days, range),
  });

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;
  if (!data)
    return (
      <div>
        <ReportControls
          days={days}
          onDays={setDays}
          range={range}
          onRange={setRange}
        />
        <p className="text-red-600">
          Không tải được báo cáo. Kiểm tra khoảng ngày (tối đa 366 ngày).
        </p>
      </div>
    );

  const pendingCount =
    (data.ordersByStatus.PENDING ?? 0) +
    (data.ordersByStatus.CONFIRMED ?? 0) +
    (data.ordersByStatus.SHIPPING ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <ReportControls
        days={days}
        onDays={setDays}
        range={range}
        onRange={setRange}
        data={data}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Thực thu ròng trong kỳ"
          value={formatVnd(data.totalRevenue)}
        />
        <StatTile label="Tổng số đơn hàng" value={String(data.totalOrders)} />
        <StatTile label="Đơn đang xử lý" value={String(pendingCount)} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Doanh thu theo thời gian
          </h2>
          <span className="text-xs text-slate-500">
            Đã hoàn: {formatVnd(data.totalRefunded)}
          </span>
        </div>
        <RevenueBarChart data={data.revenueByDay} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Đơn hàng theo trạng thái
          </h2>
          <StatusBar data={data.ordersByStatus} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Top sản phẩm bán chạy
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.topProducts.map((p) => (
                <div
                  key={p.productId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">
                    {p.name}{" "}
                    <span className="text-slate-400">× {p.quantitySold}</span>
                  </span>
                  <span className="tabular-nums font-medium text-slate-900">
                    {formatVnd(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Doanh thu theo danh mục
          </h2>
          {data.revenueByCategory.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.revenueByCategory.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">{c.category}</span>
                  <span className="tabular-nums font-medium text-slate-900">
                    {formatVnd(c.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Hiệu quả voucher
          </h2>
          {data.voucherStats.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có voucher nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="pb-1 font-normal">Mã</th>
                  <th className="pb-1 font-normal">Lượt dùng</th>
                  <th className="pb-1 font-normal text-right">Tổng giảm</th>
                </tr>
              </thead>
              <tbody>
                {data.voucherStats.map((v) => (
                  <tr key={v.voucherId} className="border-b border-slate-50">
                    <td className="py-1 font-medium text-slate-900">
                      {v.code}
                    </td>
                    <td className="py-1 text-slate-600">
                      {v.usedCount}
                      {v.usageLimit ? ` / ${v.usageLimit}` : ""}
                    </td>
                    <td className="py-1 text-right tabular-nums text-slate-900">
                      {formatVnd(v.totalDiscount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
