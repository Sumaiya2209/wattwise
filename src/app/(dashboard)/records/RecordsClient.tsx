"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";
import Modal from "@/components/Modal";
import FormField, { inputCls } from "@/components/FormField";
import FormButtons, { InlineError } from "@/components/FormButtons";
import PageHeader, { AddButton } from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import RemoteSelect from "@/components/RemoteSelect";
import { useDebounce } from "@/hooks/useDebounce";
import { useList } from "@/hooks/useList";
import { sendJson } from "@/lib/client-api";
import { fmtBdt, fmtDateTime, fmtNum } from "@/lib/format";
import type { Role } from "@/lib/rbac";

type RecordRow = {
  _id: string;
  timestamp: string;
  meterNumber: string;
  buildingName: string;
  floorName: string;
  departmentName: string;
  consumption: number;
  estimatedCost: number;
};

export default function RecordsClient({ role }: { role: Role }) {
  const router = useRouter();
  const canWrite = role === "org_admin" || role === "facility_manager";

  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState("");
  const [department, setDepartment] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  const filters = { search: debounced, building, department, from, to };
  const { rows, total, totalPages, loading, error, refresh } = useList<RecordRow>("/api/records", {
    page,
    limit: 15,
    ...filters,
  });

  const exportQs = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== "") as [string, string][]
  ).toString();

  const [open, setOpen] = useState(false);
  const [formBuilding, setFormBuilding] = useState("");
  const [meterId, setMeterId] = useState("");
  const [when, setWhen] = useState("");
  const [kwh, setKwh] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function openForm() {
    setFormBuilding("");
    setMeterId("");
    setWhen("");
    setKwh("");
    setFormError("");
    setOpen(true);
  }

  function resetFilters() {
    setSearch("");
    setBuilding("");
    setDepartment("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const r = await sendJson("/api/records", "POST", {
      meterId,
      timestamp: new Date(`${when}:00+06:00`).toISOString(),
      consumption: Number(kwh),
    });
    setSaving(false);
    if (!r.ok) return setFormError(r.error);
    setOpen(false);
    setPage(1);
    refresh();
    router.refresh(); // sidebar record count
  }

  const columns: Column<RecordRow>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (r) => <span className="ww-mono text-xs">{fmtDateTime(r.timestamp)}</span>,
    },
    { key: "meterNumber", header: "Meter ID", render: (r) => <span className="ww-mono font-bold">{r.meterNumber}</span> },
    {
      key: "location",
      header: "Building / Floor",
      render: (r) => (
        <div>
          <div>{r.buildingName}</div>
          <div className="ww-mono text-xs ww-muted">{r.floorName}</div>
        </div>
      ),
    },
    { key: "departmentName", header: "Department" },
    {
      key: "consumption",
      header: "Consumption",
      render: (r) => <span className="ww-mono font-semibold text-emerald-600 dark:text-emerald-400">{fmtNum(r.consumption, 2)} kWh</span>,
    },
    { key: "estimatedCost", header: "Est. cost", render: (r) => <span className="ww-mono">{fmtBdt(r.estimatedCost)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Energy Records"
        subtitle={`${fmtNum(total)} hourly readings${canWrite ? "" : " · read-only"}`}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={`/api/records/export${exportQs ? `?${exportQs}` : ""}`}
              className="ww-panel-2 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--ww-text)] hover:text-emerald-500"
            >
              <Download size={16} /> Export CSV
            </a>
            {canWrite && <AddButton label="Add Record" onClick={openForm} />}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          value={building}
          onChange={(v) => {
            setBuilding(v);
            setPage(1);
          }}
          placeholder="All buildings"
        />
        {canWrite ? (
          <RemoteSelect
            endpoint="/api/departments"
            params={building ? { buildingId: building } : {}}
            key={building}
            value={department}
            onChange={(v) => {
              setDepartment(v);
              setPage(1);
            }}
            placeholder="All departments"
          />
        ) : (
          <div className="hidden xl:block" />
        )}
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          className={inputCls}
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          className={inputCls}
          aria-label="To date"
        />
        <button onClick={resetFilters} className="ww-panel-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--ww-text)]">
          Clear filters
        </button>
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
        emptyText="No records match these filters"
      />

      <Modal open={open} title="Add Energy Record" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Building">
            <RemoteSelect
              endpoint="/api/buildings"
              value={formBuilding}
              onChange={(v) => {
                setFormBuilding(v);
                setMeterId("");
              }}
              placeholder="Select building"
              required
            />
          </FormField>
          {formBuilding && (
            <FormField label="Meter">
              <RemoteSelect
                key={formBuilding}
                endpoint="/api/meters"
                params={{ buildingId: formBuilding }}
                labelKey="meterNumber"
                value={meterId}
                onChange={setMeterId}
                placeholder="Select meter"
                required
              />
            </FormField>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Reading time (hourly)">
              <input required type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Consumption (kWh)">
              <input required type="number" min={0} step="any" value={kwh} onChange={(e) => setKwh(e.target.value)} className={inputCls} placeholder="e.g. 42.5" />
            </FormField>
          </div>
          <p className="text-xs ww-muted">
            Cost automatic hishab hoy organization er tariff diye. Building, floor, department meter theke bosbe. Same meter er same ghontay duita reading hobe na.
          </p>
          <InlineError message={formError} />
          <FormButtons saving={saving} submitLabel="Save record" onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </div>
  );
}