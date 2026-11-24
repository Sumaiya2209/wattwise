"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Segmented from "@/components/Segmented";
import RemoteSelect from "@/components/RemoteSelect";
import { inputCls } from "@/components/FormField";
import { useApi } from "@/hooks/useApi";
import { fmtBdt, fmtNum } from "@/lib/format";

type RType = "building" | "department" | "meter" | "daily";
type RRange = "7d" | "30d" | "custom";
type Row = { key: string; name: string; detail: string; consumption: number; cost: number; share: number; avgPerDay: number };
type Report = { rows: Row[]; totals: { consumption: number; cost: number }; range: { days: number } };

export default function ReportsClient() {
  const [type, setType] = useState<RType>("building");
  const [rangeKey, setRangeKey] = useState<RRange>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [building, setBuilding] = useState("");

  const customReady = rangeKey === "custom" && from && to;
  const qs = new URLSearchParams({ type, range: customReady ? "custom" : rangeKey === "7d" ? "7d" : "30d" });
  if (customReady) {
    qs.set("from", from);
    qs.set("to", to);
  }
  if (building) qs.set("building", building);

  const { data, error, loading } = useApi<Report>(`/api/reports?${qs.toString()}`);
  const isDaily = type === "daily";

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate energy and cost reports for any period and download as CSV"
        action={
          <a
            href={`/api/reports?${qs.toString()}&format=csv`}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 dark:text-[#04120c]"
          >
            <Download size={16} /> Download CSV
          </a>
        }
      />

      <div className="ww-panel mb-6 space-y-4 p-5">
        <div className="overflow-x-auto">
          <Segmented<RType>
            value={type}
            onChange={setType}
            options={[
              { value: "building", label: "By Building" },
              { value: "department", label: "By Department" },
              { value: "meter", label: "By Meter" },
              { value: "daily", label: "Daily Summary" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Segmented<RRange>
            value={rangeKey}
            onChange={setRangeKey}
            options={[
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "custom", label: "Custom" },
            ]}
          />
          {rangeKey === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              <span className="ww-muted">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
          )}
          <RemoteSelect
            endpoint="/api/buildings"
            value={building}
            onChange={setBuilding}
            placeholder="All buildings"
            className={`${inputCls} lg:w-56`}
          />
        </div>
        {rangeKey === "custom" && !customReady && (
          <p className="text-xs ww-muted">Duita date select korle custom range apply hobe, tar age last 30 days dekhabe.</p>
        )}
      </div>

      {error && !data && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>
      )}
      {!data && !error && <div className="ww-skeleton h-64 animate-pulse" />}

      {data && (
        <div className={`ww-panel overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="ww-eyebrow">
                <th className="px-4 py-3 font-medium">{isDaily ? "Date" : "Name"}</th>
                {!isDaily && type !== "building" && <th className="px-4 py-3 font-medium">Building</th>}
                <th className="px-4 py-3 text-right font-medium">Consumption (kWh)</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                {!isDaily && <th className="px-4 py-3 text-right font-medium">Share</th>}
                {!isDaily && <th className="px-4 py-3 text-right font-medium">Avg / day</th>}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.key} className="border-t border-[var(--ww-border)] text-[var(--ww-text)]">
                  <td className={`px-4 py-3 ${type === "meter" || isDaily ? "ww-mono font-semibold" : "font-semibold"}`}>{r.name}</td>
                  {!isDaily && type !== "building" && <td className="px-4 py-3 ww-muted">{r.detail || "—"}</td>}
                  <td className="ww-mono px-4 py-3 text-right">{fmtNum(r.consumption, 1)}</td>
                  <td className="ww-mono px-4 py-3 text-right">{fmtBdt(r.cost)}</td>
                  {!isDaily && <td className="ww-mono px-4 py-3 text-right">{r.share.toFixed(1)}%</td>}
                  {!isDaily && <td className="ww-mono px-4 py-3 text-right">{fmtNum(r.avgPerDay, 1)}</td>}
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center ww-muted">
                    No data in this period
                  </td>
                </tr>
              )}
            </tbody>
            {data.rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[var(--ww-border)] font-bold text-[var(--ww-text)]">
                  <td className="px-4 py-3">Total</td>
                  {!isDaily && type !== "building" && <td />}
                  <td className="ww-mono px-4 py-3 text-right">{fmtNum(data.totals.consumption, 1)}</td>
                  <td className="ww-mono px-4 py-3 text-right">{fmtBdt(data.totals.cost)}</td>
                  {!isDaily && <td />}
                  {!isDaily && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}