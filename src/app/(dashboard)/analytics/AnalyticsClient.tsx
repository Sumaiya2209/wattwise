"use client";

import { useSearchParams } from "next/navigation";
import { Activity, Minus, TrendingDown, TrendingUp, Wallet, Zap } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import KpiCard from "@/components/dashboard/KpiCard";
import { useApi } from "@/hooks/useApi";
import { fmtBdt, fmtCompact, fmtDay, fmtMonth, fmtNum } from "@/lib/format";

type Pt = { t: string; consumption: number; cost: number };
type Grp = { id: string; name: string; consumption: number; cost: number };
type Data = {
  range: { days: number };
  kpis: { total: number; cost: number; avgDaily: number; delta: number | null; costDelta: number | null };
  hourly: { hour: number; kwh: number }[];
  daily: Pt[];
  monthly: Pt[];
  byBuilding: Grp[];
  byDepartment: Grp[];
  trend: {
    direction: "up" | "down" | "flat";
    changePct: number | null;
    peakDay: { t: string; consumption: number } | null;
    lowDay: { t: string; consumption: number } | null;
  };
};

const axis = {
  tick: { fill: "var(--ww-muted)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

const tip = {
  contentStyle: {
    background: "var(--ww-panel)",
    border: "1px solid var(--ww-border)",
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: "var(--ww-text)" },
  itemStyle: { color: "var(--ww-text)" },
  cursor: { fill: "rgba(16,185,129,0.08)" },
} as const;

function ChartCard({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="ww-panel min-w-0 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-[var(--ww-text)]">{title}</h2>
      <p className="mt-1 text-sm ww-muted">{subtitle}</p>
      <div className="mt-4">
        {empty ? <p className="py-16 text-center text-sm ww-muted">No data in this period</p> : children}
      </div>
    </div>
  );
}

function HBar({ data, dataKey, money }: { data: Grp[]; dataKey: "consumption" | "cost"; money?: boolean }) {
  return (
    <div style={{ height: Math.max(220, data.length * 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="var(--ww-border)" strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v: number) => fmtCompact(v)} {...axis} />
          <YAxis type="category" dataKey="name" width={110} {...axis} />
          <Tooltip {...tip} formatter={(v) => (money ? fmtBdt(Number(v)) : `${fmtNum(Number(v))} kWh`)} />
          <Bar dataKey={dataKey} fill="var(--ww-accent)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimeArea({ data, dataKey, money }: { data: Pt[]; dataKey: "consumption" | "cost"; money?: boolean }) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" style={{ stopColor: "var(--ww-accent)", stopOpacity: 0.4 }} />
              <stop offset="95%" style={{ stopColor: "var(--ww-accent)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--ww-border)" strokeDasharray="3 3" />
          <XAxis dataKey="t" tickFormatter={(t: string) => fmtDay(t)} minTickGap={28} {...axis} />
          <YAxis tickFormatter={(v: number) => fmtCompact(v)} width={48} {...axis} />
          <Tooltip
            {...tip}
            labelFormatter={(l) => fmtDay(String(l))}
            formatter={(v) => (money ? fmtBdt(Number(v)) : `${fmtNum(Number(v), 1)} kWh`)}
          />
          <Area type="monotone" dataKey={dataKey} stroke="var(--ww-accent)" strokeWidth={2.5} fill={`url(#fill-${dataKey})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalyticsClient() {
  const sp = useSearchParams();
  const range = sp.get("range") ?? "30d";
  const qs = new URLSearchParams({ range });
  const building = sp.get("building");
  if (building) qs.set("building", building);
  if (range === "custom" && sp.get("from") && sp.get("to")) {
    qs.set("from", sp.get("from")!);
    qs.set("to", sp.get("to")!);
  }

  const { data, error, loading } = useApi<Data>(`/api/analytics?${qs.toString()}`);

  if (error && !data) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>;
  }
  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ww-skeleton h-72 animate-pulse" />
        ))}
      </div>
    );
  }

  const k = data.kpis;
  const t = data.trend;
  const TrendIcon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;
  const trendLabel = t.direction === "up" ? "Increasing" : t.direction === "down" ? "Decreasing" : "Stable";

  return (
    <div className={`space-y-6 transition-opacity ${loading ? "opacity-70" : ""}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Consumption" value={fmtNum(k.total)} unit="kWh" icon={Zap} delta={k.delta} />
        <KpiCard label="Electricity Cost" value={fmtBdt(k.cost)} icon={Wallet} delta={k.costDelta} />
        <KpiCard label="Avg Daily Usage" value={fmtNum(k.avgDaily, 1)} unit="kWh/d" icon={Activity} />
        <div className="ww-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[var(--ww-text)]">Consumption Trend</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <TrendIcon size={17} />
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-[var(--ww-text)]">{trendLabel}</p>
          <p className="ww-mono mt-1 text-xs ww-muted">
            {t.changePct === null ? "Need 4+ days of data" : `${t.changePct > 0 ? "+" : ""}${t.changePct.toFixed(1)}% (2nd half vs 1st half)`}
          </p>
          <div className="ww-mono mt-3 space-y-0.5 text-[11px] ww-muted">
            {t.peakDay && <p>Peak day: {fmtDay(t.peakDay.t)} · {fmtNum(t.peakDay.consumption)} kWh</p>}
            {t.lowDay && <p>Lowest day: {fmtDay(t.lowDay.t)} · {fmtNum(t.lowDay.consumption)} kWh</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Hourly Usage Pattern" subtitle="Average kWh per hour of day (BD time)" empty={k.total === 0}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.hourly.map((h) => ({ label: String(h.hour).padStart(2, "0"), kwh: h.kwh }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--ww-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={1} {...axis} />
                <YAxis tickFormatter={(v: number) => fmtCompact(v)} width={48} {...axis} />
                <Tooltip {...tip} labelFormatter={(l) => `${l}:00`} formatter={(v) => `${fmtNum(Number(v), 1)} kWh`} />
                <Bar dataKey="kwh" fill="var(--ww-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Usage" subtitle="Total kWh per day" empty={data.daily.length === 0}>
          <TimeArea data={data.daily} dataKey="consumption" />
        </ChartCard>

        <ChartCard title="Monthly Usage" subtitle="Total kWh per calendar month" empty={data.monthly.length === 0}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--ww-border)" strokeDasharray="3 3" />
                <XAxis dataKey="t" tickFormatter={(t: string) => fmtMonth(t)} {...axis} />
                <YAxis tickFormatter={(v: number) => fmtCompact(v)} width={48} {...axis} />
                <Tooltip {...tip} labelFormatter={(l) => fmtMonth(String(l))} formatter={(v) => `${fmtNum(Number(v))} kWh`} />
                <Bar dataKey="consumption" fill="var(--ww-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Cost Analysis" subtitle="Estimated electricity cost per day (BDT)" empty={data.daily.length === 0}>
          <TimeArea data={data.daily} dataKey="cost" money />
        </ChartCard>

        <ChartCard title="Building Comparison" subtitle="Consumption by building (kWh)" empty={data.byBuilding.length === 0}>
          <HBar data={data.byBuilding} dataKey="consumption" />
        </ChartCard>

        <ChartCard title="Department Comparison" subtitle="Top departments by consumption (kWh)" empty={data.byDepartment.length === 0}>
          <HBar data={data.byDepartment} dataKey="consumption" />
        </ChartCard>

        <ChartCard title="Cost by Building" subtitle="Estimated cost per building (BDT)" empty={data.byBuilding.length === 0}>
          <HBar data={data.byBuilding} dataKey="cost" money />
        </ChartCard>
      </div>
    </div>
  );
}