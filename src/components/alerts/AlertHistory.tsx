"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/DataTable";
import Segmented from "@/components/Segmented";
import RemoteSelect from "@/components/RemoteSelect";
import StatusBadge from "@/components/StatusBadge";
import { inputCls } from "@/components/FormField";
import { InlineError } from "@/components/FormButtons";
import { useList } from "@/hooks/useList";
import { sendJson } from "@/lib/client-api";
import { fmtDateTime, fmtNum } from "@/lib/format";
import type { AlertItem } from "@/types/alerts";

type StatusTab = "all" | AlertItem["status"];

export default function AlertHistory() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusTab>("all");
  const [type, setType] = useState("");
  const [building, setBuilding] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");

  const { rows, total, totalPages, loading, error, refresh } = useList<AlertItem>("/api/alerts", {
    page,
    limit: 10,
    status: status === "all" ? "" : status,
    type,
    building,
  });

  async function update(id: string, next: "acknowledged" | "resolved") {
    setBusyId(id);
    setActionError("");
    const r = await sendJson(`/api/alerts/${id}`, "PATCH", { status: next });
    setBusyId("");
    if (!r.ok) return setActionError(r.error);
    refresh();
    router.refresh(); // sidebar badge
  }

  const columns: Column<AlertItem>[] = [
    {
      key: "status",
      header: "Status",
      render: (a) => <StatusBadge label={a.status} tone={a.status === "new" ? "green" : "gray"} />,
    },
    {
      key: "type",
      header: "Type",
      render: (a) => (a.type === "high_usage" ? "High usage" : "Unusual"),
    },
    {
      key: "target",
      header: "Meter / Building",
      render: (a) => (
        <div>
          <div className="ww-mono font-semibold">{a.meterNumber ?? "—"}</div>
          <div className="text-xs ww-muted">{a.buildingName ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "message",
      header: "Details",
      render: (a) => <span className="block max-w-md text-sm ww-muted">{a.message}</span>,
    },
    {
      key: "value",
      header: "Value / Limit",
      render: (a) => (
        <span className="ww-mono text-xs">
          {fmtNum(a.value, 1)} / {a.limit ? fmtNum(a.limit, 1) : "—"} kWh
        </span>
      ),
    },
    {
      key: "triggeredAt",
      header: "Triggered",
      render: (a) => <span className="ww-mono text-xs">{fmtDateTime(a.triggeredAt)}</span>,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="overflow-x-auto">
          <Segmented<StatusTab>
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "new", label: "New" },
              { value: "acknowledged", label: "Acknowledged" },
              { value: "resolved", label: "Resolved" },
            ]}
          />
        </div>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className={`${inputCls} lg:w-44`}
        >
          <option value="">All types</option>
          <option value="high_usage">High usage</option>
          <option value="unusual">Unusual</option>
        </select>
        <RemoteSelect
          endpoint="/api/buildings"
          value={building}
          onChange={(v) => {
            setBuilding(v);
            setPage(1);
          }}
          placeholder="All buildings"
          className={`${inputCls} lg:w-56`}
        />
      </div>

      {actionError && (
        <div className="mb-4">
          <InlineError message={actionError} />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyText="No alerts match these filters"
        actions={(a) =>
          a.status === "resolved" ? (
            <span className="ww-mono text-xs ww-muted">Closed</span>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              {a.status === "new" && (
                <button
                  disabled={busyId === a._id}
                  onClick={() => update(a._id, "acknowledged")}
                  className="rounded-lg border border-emerald-500/50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-emerald-400"
                >
                  Acknowledge
                </button>
              )}
              <button
                disabled={busyId === a._id}
                onClick={() => update(a._id, "resolved")}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 dark:text-[#04120c]"
              >
                Resolve
              </button>
            </div>
          )
        }
      />
    </div>
  );
}