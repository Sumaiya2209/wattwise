"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Segmented from "@/components/Segmented";
import { TZ, fmtBdt, fmtCompact, fmtNum } from "@/lib/format";
import type { Granularity, SeriesPoint } from "@/types/dashboard";

function tick(t: string, g: Granularity) {
  const opts: Intl.DateTimeFormatOptions =
    g === "hourly"
      ? { day: "2-digit", month: "short", hour: "2-digit", hour12: false }
      : g === "monthly"
        ? { month: "short", year: "2-digit" }
        : { day: "2-digit", month: "short" };
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(t));
}

function ChartTooltip({
  active,
  payload,
  granularity,
}: {
  active?: boolean;
  payload?: { payload: SeriesPoint }[];
  granularity: Granularity;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="ww-panel px-3 py-2 text-xs shadow-xl">
      <p className="ww-mono ww-muted">{tick(p.t, granularity)}</p>
      <p className="mt-1 font-semibold text-[var(--ww-text)]">{fmtNum(p.consumption)} kWh</p>
      <p className="ww-muted">{fmtBdt(p.cost)}</p>
    </div>
  );
}

export default function ConsumptionChart({
  data,
  granularity,
  onGranularity,
  loading,
}: {
  data: SeriesPoint[];
  granularity: Granularity;
  onGranularity: (g: Granularity) => void;
  loading: boolean;
}) {
  return (
    <div className={`ww-panel p-5 sm:p-6 ${loading ? "opacity-70" : ""} transition-opacity`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--ww-text)] sm:text-xl">
              Time-Series Energy Consumption
            </h2>
            <span className="ww-eyebrow rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 !text-emerald-600 dark:!text-emerald-400">
              Server aggregated
            </span>
          </div>
          <p className="mt-1 text-sm ww-muted">kWh load curve for the selected period</p>
        </div>
        <Segmented<Granularity>
          value={granularity}
          onChange={onGranularity}
          options={[
            { value: "hourly", label: "Hourly" },
            { value: "daily", label: "Daily" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-[var(--ww-text)]">
        <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Consumption (kWh)
      </div>

      <div className="mt-4 h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="wwFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" style={{ stopColor: "var(--ww-accent)", stopOpacity: 0.45 }} />
                <stop offset="95%" style={{ stopColor: "var(--ww-accent)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--ww-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tickFormatter={(t: string) => tick(t, granularity)}
              tick={{ fill: "var(--ww-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              tickFormatter={(v: number) => fmtCompact(v)}
              tick={{ fill: "var(--ww-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<ChartTooltip granularity={granularity} />} />
            <Area
              type="monotone"
              dataKey="consumption"
              stroke="var(--ww-accent)"
              strokeWidth={2.5}
              fill="url(#wwFill)"
              dot={false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}