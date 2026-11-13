import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAdminStatistics } from "../../api/statistics";
import { RevenueBarChart } from "../../components/charts/RevenueBarChart";
import { ReportControls } from "../../components/ReportControls";
import { formatVnd } from "../../lib/format";
const roles: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  SELLER: "Người bán",
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
};
const statuses = [
  { key: "PENDING", label: "Chờ xác nhận", color: "bg-amber-400" },
  { key: "CONFIRMED", label: "Đã xác nhận", color: "bg-blue-400" },
  { key: "SHIPPING", label: "Đang giao", color: "bg-indigo-400" },
  { key: "DELIVERED", label: "Đã giao", color: "bg-emerald-400" },
  { key: "CANCELLED", label: "Đã hủy", color: "bg-rose-400" },
  { key: "RETURNED", label: "Đã trả hàng", color: "bg-slate-300" },
];
export function AdminOverviewPage() {
  const [days, setDays] = useState(14),
    [range, setRange] = useState<{ from?: string; to?: string }>({}),
    [voucherSort, setVoucherSort] = useState<"usedCount" | "totalDiscount">(
      "usedCount",
    );
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin-statistics", days, range],
    queryFn: () => getAdminStatistics(days, range),
    placeholderData: keepPreviousData,
  });
  const orderStatuses = data?.ordersByStatus ?? {};
  const period = data?.range
    ? `${new Date(data.range.from + "T00:00:00").toLocaleDateString("vi-VN")} – ${new Date(data.range.to + "T00:00:00").toLocaleDateString("vi-VN")}`
    : `${days} ngày gần nhất`;
  const metrics = [
    {
      label: "Thực thu ròng trong kỳ",
      value: data?.totalRevenue ?? 0,
      help: "Tiền đã thu trừ khoản đã hoàn",
      icon: "fa-wallet",
      dark: true,
    },
    {
      label: "Tiền đã thu",
      value: data?.totalCollected ?? 0,
      help: "Gồm tiền hàng và phí giao hàng",
      icon: "fa-arrow-trend-up",
    },
    {
      label: "Tiền đã hoàn",
      value: data?.totalRefunded ?? 0,
      help: "Khoản hoàn đã được xác nhận",
      icon: "fa-arrow-rotate-left",
    },
    {
      label: "Giá trị hàng đã giao",
      value: data?.grossMerchandiseValue ?? 0,
      help: "Trước giảm giá, không gồm phí giao",
      icon: "fa-box-open",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Hoạt động kinh doanh</p>
          <h2 className="page-title">Báo cáo tổng quan</h2>
          <p className="mt-2 text-xs text-slate-400">
            Theo dõi dòng tiền và tình hình vận hành sàn.
          </p>
        </div>
        <span className="badge bg-white text-slate-500">
          <i className="far fa-calendar" aria-hidden="true" />
          {period}
        </span>
      </div>
      <ReportControls
        days={days}
        onDays={setDays}
        range={range}
        onRange={setRange}
        data={error ? undefined : data}
        busy={isFetching}
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-600"
        >
          Không tải được báo cáo. Hãy kiểm tra khoảng ngày hoặc thử lại.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`rounded-2xl p-4 md:p-5 ${m.dark ? "bg-slate-900 text-white" : "surface"}`}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <span
                className={`text-[11px] ${m.dark ? "text-slate-300" : "text-slate-500"}`}
              >
                {m.label}
              </span>
              <i
                className={`fas ${m.icon} text-xs ${m.dark ? "text-orange-300" : "text-slate-300"}`}
                aria-hidden="true"
              />
            </div>
            <p className="break-words text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
              {isLoading ? "—" : formatVnd(m.value)}
            </p>
            <p
              className={`mt-2 text-[10px] leading-4 ${m.dark ? "text-slate-500" : "text-slate-400"}`}
            >
              {m.help}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(240px,1fr)]">
        <section className="surface min-w-0 p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="section-title">Dòng tiền theo thời gian</h3>
              <p className="mt-1 text-[11px] text-slate-400">
                Thực thu ròng · VNĐ
              </p>
            </div>
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#ed8b6d]" />
                Dương
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#e9768a]" />
                Âm
              </span>
            </div>
          </div>
          <RevenueBarChart data={data?.revenueByDay ?? []} />
          <details className="mt-4 text-[11px] leading-5 text-slate-400">
            <summary className="cursor-pointer text-slate-500">
              Cách tính dòng tiền
            </summary>
            <p className="mt-2">
              MoMo tính theo ngày thanh toán; COD theo ngày giao và ghi nhận
              thu. Khoản hoàn được trừ ở ngày xác nhận hoàn. Ngày có hoàn tiền
              lớn hơn tiền thu có thể âm. Đây là dòng tiền của giao dịch, chưa
              phải doanh thu phí của sàn.
            </p>
          </details>
        </section>
        <section className="surface p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="section-title">Đơn hàng trong kỳ</h3>
            <span className="text-xl font-semibold tabular-nums">
              {data?.totalOrders ?? 0}
            </span>
          </div>
          <div className="space-y-4">
            {statuses.map((s) => {
              const count = orderStatuses[s.key] ?? 0,
                percent = data?.totalOrders
                  ? Math.round((count / data.totalOrders) * 100)
                  : 0;
              return (
                <div key={s.key}>
                  <div className="mb-2 flex justify-between text-[11px]">
                    <span className="text-slate-500">{s.label}</span>
                    <span className="font-medium text-slate-700">
                      {count}
                      <span className="ml-2 font-normal text-slate-300">
                        {percent}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full ${s.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-[10px] leading-4 text-slate-400">
            Đếm theo đơn của từng shop được tạo trong kỳ.
          </p>
          <Link
            to="/admin/orders"
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-600"
          >
            Xem đơn hàng{" "}
            <i className="fas fa-arrow-right text-[10px]" aria-hidden="true" />
          </Link>
        </section>
      </div>
      <div className="surface grid gap-5 p-5 sm:grid-cols-3 md:p-6">
        <div>
          <p className="eyebrow mb-2">Người dùng hiện tại</p>
          <p className="text-xl font-semibold">
            {data?.totalUsers ?? 0}
            <span className="ml-2 text-xs font-normal text-slate-400">
              tài khoản
            </span>
          </p>
          <p className="mt-2 text-[10px] text-slate-400">
            {Object.entries(data?.usersByRole ?? {})
              .map(([role, n]) => `${n} ${roles[role]?.toLowerCase() ?? role}`)
              .join(" · ")}
          </p>
        </div>
        <div>
          <p className="eyebrow mb-2">Gian hàng hiện tại</p>
          <p className="text-xl font-semibold">
            {data?.totalShops ?? 0}
            <span className="ml-2 text-xs font-normal text-slate-400">
              gian hàng
            </span>
          </p>
          <Link
            to="/admin/shops"
            className="mt-2 inline-block text-[11px] text-slate-500"
          >
            {data?.shopsByStatus.APPROVED ?? 0} đã duyệt ·{" "}
            <span
              className={
                (data?.shopsByStatus.PENDING ?? 0) > 0 ? "text-amber-600" : ""
              }
            >
              {data?.shopsByStatus.PENDING ?? 0} chờ duyệt
            </span>
          </Link>
        </div>
        <div>
          <p className="eyebrow mb-2">Khoản hoàn đang chờ</p>
          <p className="text-xl font-semibold">
            {formatVnd(data?.pendingRefunds ?? 0)}
          </p>
          <Link
            to="/admin/orders"
            className="mt-2 inline-flex items-center gap-2 text-[11px] text-slate-500"
          >
            Kiểm tra và đối chiếu{" "}
            <i className="fas fa-arrow-right text-[9px]" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="surface p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="section-title">Tiền thu theo gian hàng</h3>
              <p className="mt-1 text-[11px] text-slate-400">
                Top 5 trong kỳ, trước hoàn tiền
              </p>
            </div>
            <i
              className="fas fa-ranking-star text-slate-300"
              aria-hidden="true"
            />
          </div>
          {data?.topShops.length ? (
            <div className="space-y-5">
              {data.topShops.map((s, i) => (
                <div key={s.shopId} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${i === 0 ? "bg-orange-50 text-orange-700" : "bg-slate-50 text-slate-400"}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-700">
                      {s.name}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-300"
                        style={{
                          width: `${data.topShops[0].revenue ? Math.max(0, (s.revenue / data.topShops[0].revenue) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {formatVnd(s.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyReport text="Chưa có khoản thu từ gian hàng trong kỳ này." />
          )}
        </section>
        <section className="surface min-w-0 p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Hiệu quả mã giảm giá</h3>
              <p className="mt-1 text-[11px] text-slate-400">
                Voucher toàn sàn trong kỳ
              </p>
            </div>
            <select
              aria-label="Sắp xếp voucher"
              value={voucherSort}
              onChange={(e) =>
                setVoucherSort(e.target.value as typeof voucherSort)
              }
              className="rounded-lg bg-slate-50 px-2 py-2 text-[10px] text-slate-500"
            >
              <option value="usedCount">Lượt sử dụng</option>
              <option value="totalDiscount">Tổng giảm giá</option>
            </select>
          </div>
          {data?.voucherStats.length ? (
            <div className="overflow-x-auto">
              <table className="report-table w-full">
                <thead>
                  <tr>
                    <th>Mã voucher</th>
                    <th>Lượt dùng</th>
                    <th className="text-right!">Tổng giảm</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.voucherStats]
                    .sort((a, b) => b[voucherSort] - a[voucherSort])
                    .map((v) => (
                      <tr key={v.voucherId}>
                        <td>
                          <span className="font-medium text-slate-700">
                            {v.code}
                          </span>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {v.discountType === "PERCENT"
                              ? "Theo phần trăm"
                              : "Số tiền cố định"}{" "}
                            · {v.status === "ACTIVE" ? "Đang bật" : "Đã tắt"}
                          </p>
                        </td>
                        <td className="tabular-nums text-slate-600">
                          {v.usedCount}
                          {v.usageLimit && (
                            <span className="text-slate-300">
                              {" "}
                              / {v.usageLimit}
                            </span>
                          )}
                        </td>
                        <td className="text-right text-xs! font-medium tabular-nums">
                          {formatVnd(v.totalDiscount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyReport text="Chưa có mã giảm giá toàn sàn." />
          )}
          <Link
            to="/admin/vouchers"
            className="mt-4 inline-block text-[11px] font-medium text-slate-500"
          >
            Quản lý mã giảm giá →
          </Link>
        </section>
      </div>
    </div>
  );
}
function EmptyReport({ text }: { text: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl bg-slate-50/70 px-6 text-center">
      <i
        className="fas fa-chart-simple mb-3 text-xl text-slate-200"
        aria-hidden="true"
      />
      <p className="text-xs leading-5 text-slate-400">{text}</p>
    </div>
  );
}
