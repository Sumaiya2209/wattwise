"use client";

import Segmented from "@/components/Segmented";
import { fmtNum } from "@/lib/format";
import type { DistItem, DistMode } from "@/types/dashboard";

export default function DistributionPanel({
  items,
  mode,
  onMode,
  loading,
}: {
  items: DistItem[];
  mode: DistMode;
  onMode: (m: DistMode) => void;
  loading: boolean;
}) {
  const max = items[0]?.consumption || 1;
  return (
    <div className={`ww-panel flex flex-col p-5 sm:p-6 ${loading ? "opacity-70" : ""} transition-opacity`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--ww-text)] sm:text-xl">Usage Distribution</h2>
          <p className="mt-1 text-sm ww-muted">Comparative consumption share</p>
        </div>
        <Segmented<DistMode>
          value={mode}
          onChange={onMode}
          options={[
            { value: "buildings", label: "Buildings" },
            { value: "departments", label: "Depts" },
          ]}
        />
      </div>

      <div className="mt-6 flex-1 space-y-3">
        {items.length === 0 && <p className="text-sm ww-muted">No data in this period</p>}
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs font-semibold text-[var(--ww-text)] sm:w-32 sm:text-sm">
              {it.name}
            </span>
            <div className="ww-panel-2 h-6 flex-1 overflow-hidden rounded-md">
              <div
                className="h-full rounded-md bg-emerald-500 transition-all duration-700"
                style={{ width: `${(it.consumption / max) * 100}%`, opacity: Math.max(0.35, 1 - i * 0.09) }}
              />
            </div>
            <span className="ww-mono w-16 shrink-0 text-right text-[11px] ww-muted sm:w-20">
              {fmtNum(it.consumption)}
            </span>
          </div>
        ))}
      </div>

      {items[0] && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ww-border)] pt-4 text-sm">
          <span className="ww-muted">Highest Consumer:</span>
          <span className="ww-mono font-semibold text-emerald-600 dark:text-emerald-400">
            {items[0].name} ({items[0].share.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
}