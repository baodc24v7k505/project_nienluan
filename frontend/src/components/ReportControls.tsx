import { DateRangeSelect } from "./DateRangeSelect";
import type { RevenuePoint } from "../types/statistics";
export function ReportControls({
  days,
  onDays,
  range,
  onRange,
  data,
}: {
  days: number;
  onDays: (days: number) => void;
  range: { from?: string; to?: string };
  onRange: (range: { from?: string; to?: string }) => void;
  data?: {
    revenueByDay: RevenuePoint[];
    totalCollected: number;
    totalRefunded: number;
    totalRevenue: number;
  };
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded border bg-white p-4 text-xs">
      <label>
        Từ ngày
        <input
          aria-label="Từ ngày"
          className="mt-1 block rounded border p-2"
          type="date"
          value={range.from ?? ""}
          onChange={(e) =>
            onRange({ ...range, from: e.target.value || undefined })
          }
        />
      </label>
      <label>
        Đến ngày
        <input
          aria-label="Đến ngày"
          className="mt-1 block rounded border p-2"
          type="date"
          value={range.to ?? ""}
          onChange={(e) =>
            onRange({ ...range, to: e.target.value || undefined })
          }
        />
      </label>
      <DateRangeSelect
        value={days}
        onChange={(value) => {
          onDays(value);
          onRange({});
        }}
      />
      <button
        disabled={!data}
        className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
        onClick={() => {
          if (!data) return;
          const csv =
            "\uFEFF" +
            [
              "Ngày,Thực thu ròng (VNĐ)",
              ...data.revenueByDay.map((p) => `${p.date},${p.revenue}`),
              `Tổng thu,${data.totalCollected}`,
              `Hoàn tiền,${data.totalRefunded}`,
              `Thực thu ròng,${data.totalRevenue}`,
            ].join("\r\n");
          const url = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8" }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = `bao-cao-${range.from ?? days}-${range.to ?? "ngay"}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Xuất CSV
      </button>
      <p className="w-full text-slate-500">
        Số liệu theo giờ Việt Nam. Thực thu ròng = tiền đã thu − khoản hoàn đã
        xác nhận trong kỳ. Top sản phẩm/danh mục tính theo giá trị hàng đã giao
        trước giảm giá.
      </p>
    </div>
  );
}
