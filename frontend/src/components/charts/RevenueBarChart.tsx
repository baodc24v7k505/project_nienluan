import { useEffect, useMemo, useRef, useState } from "react";
import { formatVnd } from "../../lib/format";
interface RevenuePoint {
  date: string;
  revenue: number;
}
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const compact = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export function RevenueBarChart({ data }: { data: RevenuePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, entry.contentRect.width)),
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const points = useMemo(() => {
    const step = Math.max(1, Math.ceil(data.length / 30));
    return Array.from({ length: Math.ceil(data.length / step) }, (_, idx) => {
      const group = data.slice(idx * step, (idx + 1) * step);
      return {
        date: group[0].date,
        end: group[group.length - 1].date,
        revenue: group.reduce((s, p) => s + p.revenue, 0),
      };
    });
  }, [data]);
  const height = 260,
    left = 56,
    right = 12,
    top = 20,
    bottom = 32,
    pw = width - left - right,
    ph = height - top - bottom;
  const maximum = Math.max(1, ...points.map((p) => p.revenue)),
    minimum = Math.min(0, ...points.map((p) => p.revenue));
  const y = (value: number) =>
      top + ((maximum - value) / (maximum - minimum)) * ph,
    zero = y(0),
    slot = pw / Math.max(1, points.length),
    bar = Math.max(1, Math.min(32, slot * 0.65));
  const allZero = data.every((p) => p.revenue === 0);
  return (
    <div ref={container} className="relative">
      <svg
        role="img"
        aria-label="Biểu đồ thực thu ròng theo thời gian"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minHeight: 220 }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const value = minimum + (maximum - minimum) * f,
            cy = y(value);
          return (
            <g key={i}>
              <line
                x1={left}
                x2={width - right}
                y1={cy}
                y2={cy}
                stroke="#edf0f4"
                strokeDasharray="3 5"
              />
              <text
                x={left - 10}
                y={cy + 4}
                textAnchor="end"
                fill="#9ca3af"
                fontSize={10}
              >
                {allZero ? "" : compact(value)}
              </text>
            </g>
          );
        })}
        <line
          x1={left}
          x2={width - right}
          y1={zero}
          y2={zero}
          stroke="#d9dfe7"
        />
        {points.map((p, i) => {
          const x = left + i * slot + (slot - bar) / 2,
            cy = Math.min(zero, y(p.revenue)),
            h = Math.abs(y(p.revenue) - zero);
          return (
            <g
              key={p.date}
              tabIndex={0}
              role="button"
              aria-label={`${shortDate(p.date)}${p.end !== p.date ? ` đến ${shortDate(p.end)}` : ""}: ${formatVnd(p.revenue)}`}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive(i);
                }
                if (e.key === "Escape") setActive(null);
              }}
            >
              <rect
                x={x}
                y={cy}
                width={bar}
                height={h}
                rx={Math.min(4, h / 2)}
                fill={
                  p.revenue < 0
                    ? "#e9768a"
                    : active === i
                      ? "#ce4328"
                      : "#ed8b6d"
                }
              />
              <rect
                x={left + i * slot}
                y={top}
                width={slot}
                height={ph}
                fill="transparent"
              />
              {i %
                Math.max(
                  1,
                  Math.ceil(
                    points.length / Math.max(3, Math.floor(width / 90)),
                  ),
                ) ===
                0 && (
                <text
                  x={x + bar / 2}
                  y={height - 9}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#9ca3af"
                >
                  {shortDate(p.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {allZero && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <i className="fas fa-chart-column" aria-hidden="true" />
          </span>
          <p className="text-xs text-slate-400">
            Chưa phát sinh dòng tiền trong kỳ
          </p>
        </div>
      )}
      {active !== null && points[active] && !allZero && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{
            left: `${Math.min(88, Math.max(15, ((left + (active + 0.5) * slot) / width) * 100))}%`,
          }}
        >
          <p className="text-[10px] text-slate-400">
            {shortDate(points[active].date)}
            {points[active].end !== points[active].date
              ? ` – ${shortDate(points[active].end)}`
              : ""}
          </p>
          <p className="mt-1 font-semibold">
            {formatVnd(points[active].revenue)}
          </p>
        </div>
      )}
      <p className="mt-1 text-[10px] text-slate-400">
        {data.length > 30 ? "Đã gộp theo nhóm ngày để dễ đọc. " : ""}Di chuột
        hoặc chạm vào cột để xem giá trị.
      </p>
    </div>
  );
}
