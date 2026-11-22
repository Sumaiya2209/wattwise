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
import ConfirmDialog from "@/components/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";

type DeptRow = {
  _id: string;
  name: string;
  buildingName: string;
  floorName: string;
  metersCount: number;
};

export default function DepartmentsClient() {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  const { rows, total, totalPages, loading, error, refresh, removeRow } = useList<DeptRow>("/api/departments", {
    page,
    limit: 10,
    search: debounced,
    buildingId: buildingFilter,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeptRow | null>(null);
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function openForm(d: DeptRow | null) {
    setEditing(d);
    setBuildingId("");
    setFloorId("");
    setName(d?.name ?? "");
    setFormError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const r = await sendJson(
      editing ? `/api/departments/${editing._id}` : "/api/departments",
      editing ? "PATCH" : "POST",
      editing ? { name } : { floorId, name }
    );
    setSaving(false);
    if (!r.ok) return setFormError(r.error);
    setOpen(false);
    refresh();
  }

  const del = useConfirmDelete<DeptRow>(async (d) => {
    const r = await sendJson(`/api/departments/${d._id}`, "DELETE");
    if (!r.ok) return r.error;
    removeRow(d._id);
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else refresh();
    return null;
  });

  const columns: Column<DeptRow>[] = [
    { key: "name", header: "Department" },
    { key: "buildingName", header: "Building" },
    { key: "floorName", header: "Floor" },
    { key: "metersCount", header: "Meters" },
  ];

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage departments inside floors"
        action={<AddButton label="Add Department" onClick={() => openForm(null)} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search departments..."
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

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyText="No departments found"
        actions={(d) => <RowActions onEdit={() => openForm(d)} onDelete={() => del.ask(d)} />}
      />

      <Modal open={open} title={editing ? "Edit Department" : "Add Department"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {!editing && (
            <>
              <FormField label="Building">
                <RemoteSelect
                  endpoint="/api/buildings"
                  value={buildingId}
                  onChange={(v) => {
                    setBuildingId(v);
                    setFloorId("");
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
                    onChange={setFloorId}
                    placeholder="Select floor"
                    required
                  />
                </FormField>
              )}
            </>
          )}
          <FormField label="Department name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. HVAC & Cooling" />
          </FormField>
          <InlineError message={formError} />
          <FormButtons saving={saving} submitLabel={editing ? "Save changes" : "Create"} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
      <ConfirmDialog
        open={!!del.target}
        title="Delete department?"
        message={`"${del.target?.name}" will be permanently deleted. This can't be undone.`}
        busy={del.busy}
        error={del.error}
        onConfirm={del.confirm}
        onCancel={del.cancel}
      />
    </div>
  );
}