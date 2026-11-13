import { useEffect, useRef, useState } from "react";
import type { RevenuePoint } from "../types/statistics";
interface ReportData {
  revenueByDay: RevenuePoint[];
  totalCollected: number;
  totalRefunded: number;
  totalRevenue: number;
  range?: { from: string; to: string };
}
export function ReportControls({
  days,
  onDays,
  range,
  onRange,
  data,
  busy = false,
}: {
  days: number;
  onDays: (days: number) => void;
  range: { from?: string; to?: string };
  onRange: (range: { from?: string; to?: string }) => void;
  data?: ReportData;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState({
      from: range.from ?? "",
      to: range.to ?? "",
    }),
    [error, setError] = useState("");
  const editing = useRef(false);
  useEffect(() => {
    if (editing.current) return;
    setDraft({
      from: range.from ?? data?.range?.from ?? "",
      to: range.to ?? data?.range?.to ?? "",
    });
  }, [range.from, range.to, data?.range?.from, data?.range?.to]);
  function download() {
    if (!data || busy) return;
    const csv =
      "\uFEFF" +
      [
        "Báo cáo dòng tiền (VNĐ)",
        `Từ ngày,${data.range?.from ?? range.from ?? ""}`,
        `Đến ngày,${data.range?.to ?? range.to ?? ""}`,
        "",
        "Ngày,Thực thu ròng",
        ...data.revenueByDay.map((p) => `${p.date},${p.revenue}`),
        "",
        `Tiền đã thu,${data.totalCollected}`,
        `Tiền đã hoàn,${data.totalRefunded}`,
        `Thực thu ròng,${data.totalRevenue}`,
      ].join("\r\n");
    const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-${data.range?.from ?? "tu-ngay"}-${data.range?.to ?? "den-ngay"}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="surface px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="flex gap-1 rounded-xl bg-slate-100 p-1"
          aria-label="Khoảng thời gian nhanh"
        >
          {[7, 14, 30, 90].map((value) => (
            <button
              key={value}
              aria-pressed={days === value && !range.from && !range.to}
              onClick={() => {
                editing.current = false;
                setError("");
                onDays(value);
                onRange({});
              }}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${days === value && !range.from && !range.to ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
            >
              {value} ngày
            </button>
          ))}
        </div>
        <button
          className="btn btn-secondary min-h-9 text-xs"
          disabled={!data || busy}
          onClick={download}
        >
          <i className="fas fa-arrow-down-to-line" aria-hidden="true" />
          Xuất CSV
        </button>
      </div>
      <form
        className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.from || !draft.to) {
            setError("Vui lòng chọn cả ngày bắt đầu và kết thúc");
            return;
          }
          const span =
            (new Date(draft.to).getTime() - new Date(draft.from).getTime()) /
            86400000;
          if (span < 0 || span >= 366) {
            setError(
              "Chọn khoảng từ 1 đến 366 ngày, ngày kết thúc không trước ngày bắt đầu",
            );
            return;
          }
          setError("");
          editing.current = false;
          onRange(draft);
        }}
      >
        <label className="min-w-0 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:w-48">
          Từ ngày
          <input
            aria-label="Từ ngày"
            type="date"
            required
            className="field mt-1.5 font-normal normal-case tracking-normal"
            value={draft.from}
            onChange={(e) => {
              editing.current = true;
              setDraft((v) => ({ ...v, from: e.target.value }));
            }}
          />
        </label>
        <label className="min-w-0 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:w-48">
          Đến ngày
          <input
            aria-label="Đến ngày"
            type="date"
            required
            className="field mt-1.5 font-normal normal-case tracking-normal"
            value={draft.to}
            onChange={(e) => {
              editing.current = true;
              setDraft((v) => ({ ...v, to: e.target.value }));
            }}
          />
        </label>
        <button
          disabled={busy}
          className="btn justify-self-start bg-slate-800 text-xs text-white hover:bg-slate-700"
        >
          Áp dụng
        </button>
        <span className="self-center text-right text-[10px] text-slate-400 sm:ml-auto sm:pb-2.5 sm:self-end">
          <i
            className={`fas ${busy ? "fa-circle-notch fa-spin" : "fa-clock"} mr-1.5`}
            aria-hidden="true"
          />
          {busy ? "Đang cập nhật" : "Giờ Việt Nam · UTC+7"}
        </span>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
