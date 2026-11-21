"use client";

import { Sparkles } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { fmtBdt, fmtNum, timeAgo } from "@/lib/format";
import type { InsightsData } from "@/types/alerts";

const TONE = {
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default function InsightsPanel({ query }: { query: string }) {
  const { data, error, loading } = useApi<InsightsData>(`/api/insights?${query}`);

  return (
    <div className={`ww-panel p-5 sm:p-6 ${loading && data ? "opacity-70" : ""} transition-opacity`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-500">
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-[var(--ww-text)] sm:text-xl">
              Energy Intelligence &amp; Anomaly Detection
            </h2>
            <p className="mt-1 text-sm ww-muted">
              {data
                ? `Automated pattern recognition across ${fmtNum(data.recordsAnalyzed)} time-series records`
                : "Analyzing consumption patterns..."}
            </p>
          </div>
        </div>
        {data && data.monthlySavingsBdt > 0 && (
          <span className="ww-mono w-fit shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Est. Monthly Savings: {fmtBdt(data.monthlySavingsBdt)} / mo
          </span>
        )}
      </div>

      {error && !data && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {!data &&
          !error &&
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="ww-skeleton h-44 animate-pulse" />)}

        {data?.insights.map((i) => (
          <div key={i.id} className="ww-panel-2 flex flex-col rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <span className={`ww-mono rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide ${TONE[i.tone]}`}>
                {i.tag}
              </span>
              <span className="ww-mono truncate text-[11px] ww-muted">
                {i.when ? timeAgo(i.when) : i.scope}
              </span>
            </div>
            <h3 className="mt-3 font-bold text-[var(--ww-text)]">{i.title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed ww-muted">{i.body}</p>
            <div className="ww-mono mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ww-border)] pt-3 text-xs">
              <span className={i.saveLabel === "Save" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {i.saveBdt !== null ? `${i.saveLabel} ~${fmtBdt(i.saveBdt)}${i.saveLabel === "Save" ? "/mo" : ""}` : "—"}
              </span>
              <span className="text-[var(--ww-text)]">{i.action}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}