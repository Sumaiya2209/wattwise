"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { timeAgo } from "@/lib/format";
import type { AlertItem, AlertsResponse } from "@/types/alerts";

const STATUS_STYLE = {
  new: "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  acknowledged: "border-[var(--ww-border)] text-[var(--ww-muted)]",
  resolved: "border-[var(--ww-border)] text-[var(--ww-muted)] line-through",
};

function alertTitle(a: AlertItem) {
  return a.type === "high_usage"
    ? `Threshold Exceeded: ${a.buildingName ?? a.meterNumber ?? "—"}`
    : `Unusual Consumption: ${a.meterNumber ?? "—"}`;
}

export default function AlertsPanel() {
  const [tick, setTick] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");
  const scanned = useRef(false);

  const { data, error } = useApi<AlertsResponse>(`/api/alerts?limit=6&_=${tick}`);

  const runScan = useCallback(async () => {
    setScanning(true);
    setMsg("");
    const res = await fetch("/api/alerts/scan", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setScanning(false);
    if (!res.ok) {
      setMsg(json.error ?? "Scan failed");
      return;
    }
    setMsg(`Scan complete · ${json.created} new alert(s)`);
    setTick((t) => t + 1);
  }, []);

  // Prothombar alert na thakle ekbar auto-scan
  useEffect(() => {
    if (!data || data.total > 0 || scanned.current) return;
    scanned.current = true;
    void runScan();
  }, [data, runScan]);

  async function update(id: string, status: "acknowledged" | "resolved") {
    setBusyId(id);
    setMsg("");
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId("");
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMsg(json.error ?? "Update failed");
      return;
    }
    setTick((t) => t + 1);
  }

  return (
    <div className="ww-panel flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--ww-text)] sm:text-xl">Threshold Alerts</h2>
            {data && data.newCount > 0 && (
              <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white dark:text-[#04120c]">
                {data.newCount} New
              </span>
            )}
          </div>
          <p className="mt-1 text-sm ww-muted">Limit breach &amp; anomaly notifications</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={runScan}
            disabled={scanning}
            aria-label="Scan now"
            title="Scan now"
            className="ww-panel-2 rounded-xl p-2.5 text-[var(--ww-text)] hover:text-emerald-500 disabled:opacity-60"
          >
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <Link
            href="/alerts"
            className="ww-panel-2 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ww-text)] hover:text-emerald-500"
          >
            <SlidersHorizontal size={15} /> Limits
          </Link>
        </div>
      </div>

      <div className="mt-4 max-h-[460px] flex-1 space-y-3 overflow-y-auto pr-1">
        {!data && !error && Array.from({ length: 3 }).map((_, i) => <div key={i} className="ww-skeleton h-32 animate-pulse" />)}
        {error && !data && <p className="text-sm text-red-500">{error}</p>}
        {data && data.data.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--ww-border)] p-6 text-center text-sm ww-muted">
            {scanning ? "Scanning consumption data..." : "No alerts. Everything is within limits."}
          </p>
        )}

        {data?.data.map((a) => {
          const isNew = a.status === "new";
          return (
            <div
              key={a._id}
              className={`rounded-2xl border p-4 ${
                isNew ? "border-emerald-500/50 bg-emerald-500/5" : "border-[var(--ww-border)]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`ww-mono rounded-md border px-2 py-0.5 font-bold uppercase ${STATUS_STYLE[a.status]}`}>
                  {a.status}
                </span>
                <span className="ww-mono ww-muted">
                  ALT-{a._id.slice(-4).toUpperCase()} · {timeAgo(a.triggeredAt)}
                </span>
              </div>
              <h3 className="mt-2 font-bold text-[var(--ww-text)]">{alertTitle(a)}</h3>
              <p className="ww-mono mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                {[a.meterNumber, a.buildingName].filter(Boolean).join(" • ")}
              </p>
              <p className="mt-2 text-sm ww-muted">{a.message}</p>

              {a.status !== "resolved" && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {isNew && (
                    <button
                      disabled={busyId === a._id}
                      onClick={() => update(a._id, "acknowledged")}
                      className="rounded-lg border border-emerald-500/50 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-emerald-400"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    disabled={busyId === a._id}
                    onClick={() => update(a._id, "resolved")}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 dark:text-[#04120c]"
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ww-mono mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ww-border)] pt-3 text-[11px] ww-muted">
        <span>{msg || (data ? `Showing latest ${data.data.length} of ${data.total}` : "Loading...")}</span>
        <span className="text-emerald-600 dark:text-emerald-400">WRITE ENABLED</span>
      </div>
    </div>
  );
}