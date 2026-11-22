"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/DataTable";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField, { inputCls } from "@/components/FormField";
import FormButtons, { InlineError } from "@/components/FormButtons";
import { AddButton } from "@/components/PageHeader";
import RemoteSelect from "@/components/RemoteSelect";
import RowActions from "@/components/RowActions";
import StatusBadge from "@/components/StatusBadge";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { useList } from "@/hooks/useList";
import { sendJson } from "@/lib/client-api";
import { fmtNum } from "@/lib/format";
import type { ThresholdRow } from "@/types/alerts";

export default function ThresholdsTab() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { rows, total, totalPages, loading, error, refresh, removeRow } = useList<ThresholdRow>(
    "/api/thresholds",
    { page, limit: 10 }
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ThresholdRow | null>(null);
  const [scope, setScope] = useState<"building" | "meter">("building");
  const [buildingId, setBuildingId] = useState("");
  const [meterId, setMeterId] = useState("");
  const [period, setPeriod] = useState<"hourly" | "daily">("daily");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toggleError, setToggleError] = useState("");

  const del = useConfirmDelete<ThresholdRow>(async (t) => {
    const r = await sendJson(`/api/thresholds/${t._id}`, "DELETE");
    if (!r.ok) return r.error;
    removeRow(t._id);
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else refresh();
    return null;
  });

  function openForm(t: ThresholdRow | null) {
    setEditing(t);
    setScope(t?.scope ?? "building");
    setBuildingId("");
    setMeterId("");
    setPeriod(t?.period ?? "daily");
    setLimit(t ? String(t.limitKwh) : "");
    setFormError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = editing
      ? { limitKwh: Number(limit), period }
      : {
          scope,
          period,
          limitKwh: Number(limit),
          ...(scope === "building" ? { buildingId } : { meterId }),
        };
    const r = await sendJson(
      editing ? `/api/thresholds/${editing._id}` : "/api/thresholds",
      editing ? "PATCH" : "POST",
      body
    );
    setSaving(false);
    if (!r.ok) return setFormError(r.error);
    setOpen(false);
    refresh();
    // Notun limit e alert sathe sathe toiri hobe
    void fetch("/api/alerts/scan", { method: "POST" }).then(() => router.refresh());
  }

  async function toggle(t: ThresholdRow) {
    setToggleError("");
    const r = await sendJson(`/api/thresholds/${t._id}`, "PATCH", { isActive: !t.isActive });
    if (!r.ok) return setToggleError(r.error);
    refresh();
  }

  const columns: Column<ThresholdRow>[] = [
    {
      key: "targetName",
      header: "Target",
      render: (t) => (
        <div>
          <div className={t.scope === "meter" ? "ww-mono font-bold" : "font-semibold"}>{t.targetName}</div>
          {t.buildingName && <div className="text-xs ww-muted">{t.buildingName}</div>}
        </div>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (t) => <StatusBadge label={t.scope} tone="gray" />,
    },
    { key: "period", header: "Period", render: (t) => <span className="capitalize">{t.period}</span> },
    {
      key: "limitKwh",
      header: "Limit",
      render: (t) => <span className="ww-mono font-semibold">{fmtNum(t.limitKwh, 1)} kWh</span>,
    },
    {
      key: "isActive",
      header: "Monitoring",
      render: (t) => (
        <button
          type="button"
          role="switch"
          aria-checked={t.isActive}
          aria-label="Toggle monitoring"
          onClick={() => toggle(t)}
          className={`relative h-6 w-11 rounded-full transition ${t.isActive ? "bg-emerald-500" : "bg-[var(--ww-border)]"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              t.isActive ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm ww-muted">
          Alert toiri hoy jokhon kono building ba meter er consumption nirdharito limit chharay.
        </p>
        <AddButton label="Add Limit" onClick={() => openForm(null)} />
      </div>

      {toggleError && (
        <div className="mb-4">
          <InlineError message={toggleError} />
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
        emptyText="No limits configured yet"
        actions={(t) => <RowActions onEdit={() => openForm(t)} onDelete={() => del.ask(t)} />}
      />

      <Modal open={open} title={editing ? "Edit Limit" : "Add Consumption Limit"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {editing ? (
            <p className="ww-panel-2 rounded-xl px-3 py-2.5 text-sm text-[var(--ww-text)]">
              <span className="capitalize">{editing.scope}</span> · {editing.targetName}
            </p>
          ) : (
            <>
              <FormField label="Apply to">
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value as "building" | "meter");
                    setBuildingId("");
                    setMeterId("");
                  }}
                  className={inputCls}
                >
                  <option value="building">Building</option>
                  <option value="meter">Single meter</option>
                </select>
              </FormField>
              <FormField label="Building">
                <RemoteSelect
                  endpoint="/api/buildings"
                  value={buildingId}
                  onChange={(v) => {
                    setBuildingId(v);
                    setMeterId("");
                  }}
                  placeholder="Select building"
                  required
                />
              </FormField>
              {scope === "meter" && buildingId && (
                <FormField label="Meter">
                  <RemoteSelect
                    key={buildingId}
                    endpoint="/api/meters"
                    params={{ buildingId }}
                    labelKey="meterNumber"
                    value={meterId}
                    onChange={setMeterId}
                    placeholder="Select meter"
                    required
                  />
                </FormField>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Period">
              <select value={period} onChange={(e) => setPeriod(e.target.value as "hourly" | "daily")} className={inputCls}>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </FormField>
            <FormField label="Limit (kWh)">
              <input
                required
                type="number"
                min={0.01}
                step="any"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className={inputCls}
                placeholder="e.g. 2000"
              />
            </FormField>
          </div>
          <p className="text-xs ww-muted">
            Daily = ek diner mot kWh, Hourly = ek ghontar mot kWh. Eta cross korle High Usage alert hobe.
          </p>

          <InlineError message={formError} />
          <FormButtons saving={saving} submitLabel={editing ? "Save changes" : "Create limit"} onCancel={() => setOpen(false)} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!del.target}
        title="Delete limit?"
        message={`The ${del.target?.period} limit for "${del.target?.targetName}" will be removed. Existing alert history stays.`}
        busy={del.busy}
        error={del.error}
        onConfirm={del.confirm}
        onCancel={del.cancel}
      />
    </div>
  );
}