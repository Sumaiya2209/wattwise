"use client";

import { useState } from "react";
import DataTable, { type Column } from "@/components/DataTable";
import Modal from "@/components/Modal";
import FormField, { inputCls } from "@/components/FormField";
import FormButtons, { InlineError } from "@/components/FormButtons";
import PageHeader, { AddButton } from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import RowActions from "@/components/RowActions";
import RemoteSelect from "@/components/RemoteSelect";
import StatusBadge from "@/components/StatusBadge";
import { useDebounce } from "@/hooks/useDebounce";
import { useList } from "@/hooks/useList";
import { sendJson } from "@/lib/client-api";
import { fmtDateTime } from "@/lib/format";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";

type MeterRow = {
  _id: string;
  meterNumber: string;
  type: "main" | "sub";
  status: "active" | "inactive" | "faulty";
  buildingName: string;
  floorName: string;
  departmentName: string;
  lastReadingAt?: string;
};

const STATUS_TONE = { active: "green", inactive: "gray", faulty: "red" } as const;

export default function MetersClient() {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  const { rows, total, totalPages, loading, error, refresh, removeRow } = useList<MeterRow>("/api/meters", {
    page,
    limit: 10,
    search: debounced,
    buildingId: buildingFilter,
    status: statusFilter,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MeterRow | null>(null);
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [type, setType] = useState<"main" | "sub">("sub");
  const [status, setStatus] = useState<"active" | "inactive" | "faulty">("active");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function openForm(m: MeterRow | null) {
    setEditing(m);
    setBuildingId("");
    setFloorId("");
    setDepartmentId("");
    setMeterNumber(m?.meterNumber ?? "");
    setType(m?.type ?? "sub");
    setStatus(m?.status ?? "active");
    setFormError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = editing
      ? { meterNumber, type, status }
      : { departmentId, meterNumber, type, status };
    const r = await sendJson(editing ? `/api/meters/${editing._id}` : "/api/meters", editing ? "PATCH" : "POST", body);
    setSaving(false);
    if (!r.ok) return setFormError(r.error);
    setOpen(false);
    refresh();
  }

  const del = useConfirmDelete<MeterRow>(async (m) => {
    const r = await sendJson(`/api/meters/${m._id}`, "DELETE");
    if (!r.ok) return r.error;
    removeRow(m._id);
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else refresh();
    return null;
  });

  const columns: Column<MeterRow>[] = [
    { key: "meterNumber", header: "Meter ID", render: (m) => <span className="ww-mono font-bold">{m.meterNumber}</span> },
    {
      key: "location",
      header: "Building / Floor",
      render: (m) => (
        <div>
          <div>{m.buildingName}</div>
          <div className="ww-mono text-xs ww-muted">{m.floorName}</div>
        </div>
      ),
    },
    { key: "departmentName", header: "Department" },
    { key: "type", header: "Type", render: (m) => <span className="capitalize">{m.type}</span> },
    { key: "status", header: "Status", render: (m) => <StatusBadge label={m.status} tone={STATUS_TONE[m.status]} /> },
    {
      key: "lastReadingAt",
      header: "Last reading",
      render: (m) => (m.lastReadingAt ? <span className="ww-mono text-xs">{fmtDateTime(m.lastReadingAt)}</span> : "—"),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Smart Meters"
        subtitle="Register and manage electricity meters"
        action={<AddButton label="Add Meter" onClick={() => openForm(null)} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search meter ID..."
        />
        <RemoteSelect
          endpoint="/api/buildings"
          value={buildingFilter}
          onChange={(v) => {
            setBuildingFilter(v);
            setPage(1);
          }}
          placeholder="All buildings"
          className={`${inputCls} sm:w-56`}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={`${inputCls} sm:w-44`}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="faulty">Faulty</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyText="No meters found"
        actions={(m) => <RowActions onEdit={() => openForm(m)} onDelete={() => del.ask(m)} />}
      />

      <Modal open={open} title={editing ? "Edit Meter" : "Add Meter"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {editing ? (
            <p className="ww-panel-2 rounded-xl px-3 py-2.5 text-sm text-[var(--ww-text)]">
              {editing.buildingName} · {editing.floorName} · {editing.departmentName}
            </p>
          ) : (
            <>
              <FormField label="Building">
                <RemoteSelect
                  endpoint="/api/buildings"
                  value={buildingId}
                  onChange={(v) => {
                    setBuildingId(v);
                    setFloorId("");
                    setDepartmentId("");
                  }}
                  placeholder="Select building"
                  required
                />
              </FormField>
              {buildingId && (
                <FormField label="Floor">
                  <RemoteSelect
                    key={buildingId}
                    endpoint="/api/floors"
                    params={{ buildingId }}
                    value={floorId}
                    onChange={(v) => {
                      setFloorId(v);
                      setDepartmentId("");
                    }}
                    placeholder="Select floor"
                    required
                  />
                </FormField>
              )}
              {floorId && (
                <FormField label="Department">
                  <RemoteSelect
                    key={floorId}
                    endpoint="/api/departments"
                    params={{ floorId }}
                    value={departmentId}
                    onChange={setDepartmentId}
                    placeholder="Select department"
                    required
                  />
                </FormField>
              )}
            </>
          )}
          <FormField label="Meter ID">
            <input
              required
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value.toUpperCase())}
              className={`${inputCls} ww-mono`}
              placeholder="e.g. ZENITH-M-0099"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <select value={type} onChange={(e) => setType(e.target.value as "main" | "sub")} className={inputCls}>
                <option value="sub">Sub meter</option>
                <option value="main">Main meter</option>
              </select>
            </FormField>
            <FormField label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive" | "faulty")}
                className={inputCls}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="faulty">Faulty</option>
              </select>
            </FormField>
          </div>
          <InlineError message={formError} />
          <FormButtons saving={saving} submitLabel={editing ? "Save changes" : "Register meter"} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
      <ConfirmDialog
        open={!!del.target}
        title="Delete meter?"
        message={`Meter "${del.target?.meterNumber}" will be permanently deleted. This can't be undone.`}
        busy={del.busy}
        error={del.error}
        onConfirm={del.confirm}
        onCancel={del.cancel}
      />
    </div>
  );
}