import Link from "next/link";
import { fmtBdt, fmtNum } from "@/lib/format";
import type { MeterRow } from "@/types/dashboard";

export default function MetersGridPanel({
  rows,
  loading,
  canViewAll,
}: {
  rows: MeterRow[];
  loading: boolean;
  canViewAll: boolean;
}) {
  return (
    <div className={`ww-panel p-5 sm:p-6 ${loading ? "opacity-70" : ""} transition-opacity`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--ww-text)] sm:text-xl">Smart Meter Telemetry Grid</h2>
          <p className="mt-1 text-sm ww-muted">Top meters by consumption in the selected period</p>
        </div>
        {canViewAll && (
          <Link
            href="/meters"
            className="rounded-lg border border-[var(--ww-border)] px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            View all meters
          </Link>
        )}
      </div>

      <div className="ww-panel-2 mt-5 overflow-x-auto rounded-xl">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="ww-eyebrow">
              <th className="px-4 py-3 font-medium">Meter ID</th>
              <th className="px-4 py-3 font-medium">Building / Floor</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 text-right font-medium">Avg load (kW)</th>
              <th className="px-4 py-3 text-right font-medium">Total (kWh)</th>
              <th className="px-4 py-3 text-right font-medium">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-[var(--ww-border)]">
                <td className="ww-mono px-4 py-3 font-bold text-[var(--ww-text)]">{m.meterNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--ww-text)]">{m.building}</div>
                  <div className="ww-mono text-xs ww-muted">{m.floor}</div>
                </td>
                <td className="px-4 py-3 text-[var(--ww-text)]">{m.department}</td>
                <td className="ww-mono px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmtNum(m.avgKw, 1)}
                </td>
                <td className="ww-mono px-4 py-3 text-right text-[var(--ww-text)]">{fmtNum(m.consumption)}</td>
                <td className="ww-mono px-4 py-3 text-right text-[var(--ww-text)]">{fmtBdt(m.cost)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center ww-muted">
                  No meter data in this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}