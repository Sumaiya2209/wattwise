"use client";

import { useState } from "react";
import DataTable, { type Column } from "@/components/DataTable";
import Modal from "@/components/Modal";
import FormField, { inputCls } from "@/components/FormField";
import FormButtons, { InlineError } from "@/components/FormButtons";
import PageHeader, { AddButton } from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import RowActions from "@/components/RowActions";
import { useDebounce } from "@/hooks/useDebounce";
import { useList } from "@/hooks/useList";
import { sendJson } from "@/lib/client-api";

type Building = {
  _id: string;
  name: string;
  address?: string;
  floorsCount: number;
  createdAt: string;
};

export default function BuildingsClient() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  const { rows, total, totalPages, loading, error, refresh } = useList<Building>("/api/buildings", {
    page,
    limit: 10,
    search: debounced,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  function openForm(b: Building | null) {
    setEditing(b);
    setName(b?.name ?? "");
    setAddress(b?.address ?? "");
    setFormError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const r = await sendJson(editing ? `/api/buildings/${editing._id}` : "/api/buildings", editing ? "PATCH" : "POST", {
      name,
      address,
    });
    setSaving(false);
    if (!r.ok) return setFormError(r.error);
    setOpen(false);
    refresh();
  }

  async function remove(b: Building) {
    if (!confirm(`Delete "${b.name}"?`)) return;
    setActionError("");
    const r = await sendJson(`/api/buildings/${b._id}`, "DELETE");
    if (!r.ok) return setActionError(r.error);
    refresh();
  }

  const columns: Column<Building>[] = [
    { key: "name", header: "Building" },
    { key: "address", header: "Address" },
    { key: "floorsCount", header: "Floors" },
    { key: "createdAt", header: "Created", render: (b) => new Date(b.createdAt).toLocaleDateString("en-GB") },
  ];

  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="Manage your organization's buildings"
        action={<AddButton label="Add Building" onClick={() => openForm(null)} />}
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search buildings..."
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
        emptyText="No buildings found"
        actions={(b) => <RowActions onEdit={() => openForm(b)} onDelete={() => remove(b)} />}
      />

      <Modal open={open} title={editing ? "Edit Building" : "Add Building"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Building name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. North Tower" />
          </FormField>
          <FormField label="Address (optional)">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="e.g. Zindabazar, Sylhet" />
          </FormField>
          <InlineError message={formError} />
          <FormButtons saving={saving} submitLabel={editing ? "Save changes" : "Create"} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </div>
  );
}