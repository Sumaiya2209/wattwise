"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";
import Modal from "@/components/Modal";
import FormField, { inputCls } from "@/components/FormField";
import { useDebounce } from "@/hooks/useDebounce";
import { useList } from "@/hooks/useList";

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
  const debouncedSearch = useDebounce(search);

  const { rows, total, totalPages, loading, error, refresh } = useList<Building>(
    "/api/buildings",
    { page, limit: 10, search: debouncedSearch }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(b: Building) {
    setEditing(b);
    setName(b.name);
    setAddress(b.address ?? "");
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const res = await fetch(editing ? `/api/buildings/${editing._id}` : "/api/buildings", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setFormError(json.error ?? "Something went wrong");
      return;
    }
    setModalOpen(false);
    refresh();
  }

  async function handleDelete(b: Building) {
    if (!confirm(`Delete "${b.name}"?`)) return;
    setActionError("");
    const res = await fetch(`/api/buildings/${b._id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setActionError(json.error ?? "Delete failed");
      return;
    }
    refresh();
  }

  const columns: Column<Building>[] = [
    { key: "name", header: "Building" },
    { key: "address", header: "Address" },
    { key: "floorsCount", header: "Floors" },
    {
      key: "createdAt",
      header: "Created",
      render: (b) => new Date(b.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buildings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your organization&apos;s buildings
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus size={18} /> Add Building
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus-within:border-emerald-500 dark:border-gray-700 dark:bg-gray-900 sm:max-w-sm">
        <Search size={16} className="text-gray-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search buildings..."
          className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {actionError}
        </p>
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
        emptyText="No buildings found"
        actions={(b) => (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => openEdit(b)}
              aria-label="Edit"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-emerald-600 dark:hover:bg-gray-800"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDelete(b)}
              aria-label="Delete"
              className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        title={editing ? "Edit Building" : "Add Building"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Building name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. North Tower"
            />
          </FormField>
          <FormField label="Address (optional)">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputCls}
              placeholder="e.g. Zindabazar, Sylhet"
            />
          </FormField>
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {editing ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}