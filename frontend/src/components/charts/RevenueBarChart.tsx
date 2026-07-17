import { useState } from 'react';
import { formatVnd } from '../../lib/format';

interface RevenuePoint {
  date: string;
  revenue: number;
}

const BAR_FILL = '#2a78d6';
const GRIDLINE = '#e1e0d9';
const BASELINE = '#c3c2b7';
const MUTED = '#898781';

function roundedTopBarPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, Math.max(height, 0));
  if (height <= 0) return '';
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function RevenueBarChart({ data }: { data: RevenuePoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 600;
  const height = 220;
  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 16;
  const paddingBottom = 24;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const barGap = 2;
  const barWidth = data.length > 0 ? plotWidth / data.length - barGap : 0;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: 220 }}
        role="img"
        aria-label="Biểu đồ doanh thu theo ngày"
      >
        {gridLines.map((g) => {
          const y = paddingTop + plotHeight * (1 - g);
          return (
            <line
              key={g}
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={y}
              y2={y}
              stroke={GRIDLINE}
              strokeWidth={1}
            />
          );
        })}
        <line
          x1={paddingLeft}
          x2={width - paddingRight}
          y1={paddingTop + plotHeight}
          y2={paddingTop + plotHeight}
          stroke={BASELINE}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barHeight = (d.revenue / maxRevenue) * plotHeight;
          const x = paddingLeft + i * (barWidth + barGap);
          const y = paddingTop + plotHeight - barHeight;
          const showLabel = data.length <= 10 || i % 2 === 0;
          return (
            <g key={d.date}>
              <path
                d={roundedTopBarPath(x, y, barWidth, barHeight, 4)}
                fill={BAR_FILL}
                opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.55}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
              <rect
                x={x}
                y={paddingTop}
                width={barWidth}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill={MUTED}
                >
                  {formatDayLabel(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-md"
          style={{
            left: `${((paddingLeft + hoverIndex * (barWidth + barGap) + barWidth / 2) / width) * 100}%`,
            top: `${(paddingTop / height) * 100}%`,
          }}
        >
          <p className="font-medium text-slate-900">{formatDayLabel(data[hoverIndex].date)}</p>
          <p className="text-slate-600">{formatVnd(data[hoverIndex].revenue)}</p>
        </div>
      )}
    </div>
  );
}
