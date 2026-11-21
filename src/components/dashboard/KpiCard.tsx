import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  delta,
  footer,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  delta?: number | null; // percent, kom hoilei bhalo
  footer?: React.ReactNode;
}) {
  const good = (delta ?? 0) <= 0;
  return (
    <div className="ww-panel p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/40">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-[var(--ww-text)]">{label}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Icon size={17} />
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight text-[var(--ww-text)]">{value}</span>
        {unit && <span className="ww-mono text-xs ww-muted">{unit}</span>}
      </div>

      <div className="mt-3 flex min-h-6 items-center gap-2 text-xs ww-muted">
        {delta !== undefined && (
          delta === null ? (
            <span className="ww-mono">No prev data</span>
          ) : (
            <>
              <span
                className={`ww-mono inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${
                  good
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}
              >
                {delta <= 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                {Math.abs(delta).toFixed(1)}%
              </span>
              <span>vs prev period</span>
            </>
          )
        )}
        {footer}
      </div>
    </div>
  );
}