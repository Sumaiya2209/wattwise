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
import { useDebounce } from "@/hooks/useDebounce";
import { useList } from "@/hooks/useList";
import { sendJson } from "@/lib/client-api";

type FloorRow = {
  _id: string;
  buildingId: string;
  buildingName: string;
  name: string;
  level: number;
  departmentsCount: number;
};

export default function FloorsClient() {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  const { rows, total, totalPages, loading, error, refresh } = useList<FloorRow>("/api/floors", {
    page,
    limit: 10,
    search: debounced,
    buildingId: buildingFilter,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FloorRow | null>(null);
  const [buildingId, setBuildingId] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  function openForm(f: FloorRow | null) {
    setEditing(f);
    setBuildingId(f?.buildingId ?? "");
    setName(f?.name ?? "");
    setLevel(f ? String(f.level) : "");
    setFormError("");
    setOpen(true);
  }

  function onLevel(v: string) {
    setLevel(v);
    if (name === "" || /^Floor \d+$/.test(name)) setName(v === "" ? "" : `Floor ${v}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = editing ? { name, level: Number(level) } : { buildingId, name, level: Number(level) };
    const r = await sendJson(editing ? `/api/floors/${editing._id}` : "/api/floors", editing ? "PATCH" : "POST", body);
    setSaving(false);
    if (!r.ok) return setFormError(r.error);
    setOpen(false);
    refresh();
  }

  async function remove(f: FloorRow) {
    if (!confirm(`Delete "${f.name}" of ${f.buildingName}?`)) return;
    setActionError("");
    const r = await sendJson(`/api/floors/${f._id}`, "DELETE");
    if (!r.ok) return setActionError(r.error);
    refresh();
  }

  const columns: Column<FloorRow>[] = [
    { key: "name", header: "Floor" },
    { key: "buildingName", header: "Building" },
    { key: "level", header: "Level" },
    { key: "departmentsCount", header: "Departments" },
  ];

  return (
    <div>
      <PageHeader
        title="Floors"
        subtitle="Manage floors of each building"
        action={<AddButton label="Add Floor" onClick={() => openForm(null)} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search floors..."
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
      </div>
      {actionError && <div className="mb-4"><InlineError message={actionError} /></div>}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyText="No floors found"
        actions={(f) => <RowActions onEdit={() => openForm(f)} onDelete={() => remove(f)} />}
      />

      <Modal open={open} title={editing ? "Edit Floor" : "Add Floor"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {!editing && (
            <FormField label="Building">
              <RemoteSelect endpoint="/api/buildings" value={buildingId} onChange={setBuildingId} placeholder="Select building" required />
            </FormField>
          )}
          <FormField label="Level (0 = ground)">
            <input required type="number" min={0} value={level} onChange={(e) => onLevel(e.target.value)} className={inputCls} placeholder="e.g. 1" />
          </FormField>
          <FormField label="Floor name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Floor 1" />
          </FormField>
          <InlineError message={formError} />
          <FormButtons saving={saving} submitLabel={editing ? "Save changes" : "Create"} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </div>
  );
}