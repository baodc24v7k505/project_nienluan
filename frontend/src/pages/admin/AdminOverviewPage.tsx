import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminStatistics } from "../../api/statistics";
import { StatTile } from "../../components/StatTile";
import { RevenueBarChart } from "../../components/charts/RevenueBarChart";
import { ReportControls } from "../../components/ReportControls";
import { formatVnd } from "../../lib/format";

const roleLabel: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  SELLER: "Người bán",
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
};

const shopStatusLabel: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  SUSPENDED: "Tạm khóa",
};

export function AdminOverviewPage() {
  const [days, setDays] = useState(14);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const { data, isLoading } = useQuery({
    queryKey: ["admin-statistics", days, range],
    queryFn: () => getAdminStatistics(days, range),
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

  return (
    <div className="flex flex-col gap-6">
      <ReportControls
        days={days}
        onDays={setDays}
        range={range}
        onRange={setRange}
        data={data}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatTile label="Tổng người dùng" value={String(data.totalUsers)} />
        <StatTile label="Tổng shop" value={String(data.totalShops)} />
        <StatTile
          label="Đơn theo shop trong kỳ"
          value={String(data.totalOrders)}
        />
        <StatTile
          label="Thực thu ròng trong kỳ"
          value={formatVnd(data.totalRevenue)}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Doanh thu toàn hệ thống
          </h2>
          <span className="text-xs text-slate-500">
            Đã hoàn: {formatVnd(data.totalRefunded)}
          </span>
        </div>
        <RevenueBarChart data={data.revenueByDay} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Người dùng theo vai trò
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(data.usersByRole).map(([role, count]) => (
              <div key={role} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {roleLabel[role] ?? role}
                </span>
                <span className="tabular-nums text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Shop theo trạng thái
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(data.shopsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {shopStatusLabel[status] ?? status}
                </span>
                <span className="tabular-nums text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Top shop doanh thu
          </h2>
          {data.topShops.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.topShops.map((s) => (
                <div key={s.shopId} className="flex justify-between text-sm">
                  <span className="text-slate-600">{s.name}</span>
                  <span className="tabular-nums font-medium text-slate-900">
                    {formatVnd(s.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Hiệu quả voucher toàn sàn
        </h2>
        {data.voucherStats.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có voucher nào</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="pb-1 font-normal">Mã</th>
                <th className="pb-1 font-normal">Loại</th>
                <th className="pb-1 font-normal">Lượt dùng</th>
                <th className="pb-1 font-normal text-right">Tổng giảm</th>
              </tr>
            </thead>
            <tbody>
              {data.voucherStats.map((v) => (
                <tr key={v.voucherId} className="border-b border-slate-50">
                  <td className="py-1 font-medium text-slate-900">{v.code}</td>
                  <td className="py-1 text-slate-600">
                    {v.discountType === "PERCENT" ? "Theo %" : "Cố định"}
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
  );
}
