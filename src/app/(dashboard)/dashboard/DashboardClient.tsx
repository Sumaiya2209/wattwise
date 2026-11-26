"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, ArrowDownToLine, ArrowUpRight, Leaf, Wallet, Zap } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ConsumptionChart from "@/components/dashboard/ConsumptionChart";
import DistributionPanel from "@/components/dashboard/DistributionPanel";
import MetersGridPanel from "@/components/dashboard/MetersGridPanel";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import { useApi } from "@/hooks/useApi";
import { fmtBdt, fmtDateTime, fmtNum } from "@/lib/format";
import type { Role } from "@/lib/rbac";
import type { DashboardData, DistMode, Granularity } from "@/types/dashboard";


export default function DashboardClient({ role }: { role: Role }) {
  const sp = useSearchParams();
  const range = sp.get("range") ?? "30d";
  const building = sp.get("building") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  const [granOverride, setGranOverride] = useState<Granularity | null>(null);
  const [dist, setDist] = useState<DistMode>("buildings");
  const granularity: Granularity = granOverride ?? (range === "today" ? "hourly" : "daily");

  const base = new URLSearchParams({ range });
  if (building) base.set("building", building);
  if (range === "custom" && from && to) {
    base.set("from", from);
    base.set("to", to);
  }
  const baseQuery = base.toString();
  const qs = new URLSearchParams(base);
  qs.set("granularity", granularity);
  qs.set("by", dist);

  const { data, error, loading } = useApi<DashboardData>(`/api/dashboard?${qs.toString()}`);
  const canAlerts = role === "org_admin" || role === "facility_manager";

  if (error && !data) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ww-skeleton h-36 animate-pulse" />
          ))}
        </div>
        <div className="ww-skeleton h-96 animate-pulse" />
      </div>
    );
  }

  const k = data.kpis;
  const avgPct = Math.min(100, (k.avgDaily / Math.max(k.avgDaily, k.prevAvgDaily, 1)) * 100);

  return (
    <div className="space-y-6">
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 ${
          loading ? "opacity-70" : ""
        } transition-opacity`}
      >
        <KpiCard label="Total Consumption" value={fmtNum(k.totalConsumption)} unit="kWh" icon={Zap} delta={k.consumptionDelta} />
        <KpiCard
          label="Electricity Cost"
          value={fmtBdt(k.totalCost)}
          icon={Wallet}
          delta={k.costDelta}
          footer={<span className="ww-mono">Tariff ৳{data.tariff}/kWh</span>}
        />
        <KpiCard
          label="Avg Daily Usage"
          value={fmtNum(k.avgDaily, 1)}
          unit="kWh/d"
          icon={Activity}
          footer={
            <div className="w-full">
              <div className="ww-panel-2 h-1.5 w-full overflow-hidden rounded-full">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${avgPct}%` }} />
              </div>
              <p className="ww-mono mt-1.5 text-[11px]">Prev period: {fmtNum(k.prevAvgDaily, 1)} kWh/d</p>
            </div>
          }
        />
        <KpiCard
          label="Peak Demand"
          value={k.peak ? fmtNum(k.peak.kw, 1) : "—"}
          unit="kW"
          icon={ArrowUpRight}
          footer={k.peak && <span className="ww-mono">@ {fmtDateTime(k.peak.at)}</span>}
        />
        <KpiCard
          label="Base Load (Low)"
          value={k.low ? fmtNum(k.low.kw, 1) : "—"}
          unit="kW"
          icon={ArrowDownToLine}
          footer={k.low && <span className="ww-mono">@ {fmtDateTime(k.low.at)}</span>}
        />
        <KpiCard
          label="Carbon Emission (est.)"
          value={fmtNum(k.carbonKg / 1000, 1)}
          unit="tCO₂e"
          icon={Leaf}
          footer={<span className="ww-mono">≈ {data.carbonFactor} kg CO₂e / kWh</span>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <ConsumptionChart data={data.series} granularity={granularity} onGranularity={setGranOverride} loading={loading} />
        </div>
        <DistributionPanel items={data.distribution} mode={dist} onMode={setDist} loading={loading} />
      </div>

      <InsightsPanel query={baseQuery} />

      {canAlerts ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="min-w-0 xl:col-span-2">
            <AlertsPanel />
          </div>
          <div className="min-w-0 xl:col-span-3">
            <MetersGridPanel rows={data.meters} loading={loading} canViewAll />
          </div>
        </div>
      ) : (
        <MetersGridPanel rows={data.meters} loading={loading} canViewAll={false} />
      )}
    </div>
  );
}