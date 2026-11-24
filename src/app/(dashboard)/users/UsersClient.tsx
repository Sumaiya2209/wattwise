"use client";

import { useState } from "react";
import DataTable, { type Column } from "@/components/DataTable";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField, { inputCls } from "@/components/FormField";
import FormButtons, { InlineError } from "@/components/FormButtons";
import PageHeader, { AddButton } from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import RowActions from "@/components/RowActions";
import RemoteSelect from "@/components/RemoteSelect";
import StatusBadge from "@/components/StatusBadge";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { useDebounce } from "@/hooks/useDebounce";
import { useList } from "@/hooks/useList";
import { sendJson } from "@/lib/client-api";
import { ROLE_BADGES, ROLE_LABELS, type Role } from "@/lib/rbac";

type UserRow = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  departmentName?: string;
  createdAt: string;
};

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export default function UsersClient({ currentUserId }: { currentUserId: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  const { rows, total, totalPages, loading, error, refresh, removeRow } = useList<UserRow>("/api/users", {
    page,
    limit: 10,
    search: debounced,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [departmentId, setDepartmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const del = useConfirmDelete<UserRow>(async (u) => {
    const r = await sendJson(`/api/users/${u._id}`, "DELETE");
    if (!r.ok) return r.error;
    removeRow(u._id);
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else refresh();
    return null;
  });

  function openForm(u: UserRow | null) {
    setEditing(u);
    setName(u?.name ?? "");
    setEmail(u?.email ?? "");
    setPassword("");
    setRole(u?.role ?? "viewer");
    setDepartmentId("");
    setFormError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const dept = role === "department_manager" ? { departmentId } : {};
    const r = editing
      ? await sendJson(`/api/users/${editing._id}`, "PATCH", { name, role, ...dept })
      : await sendJson("/api/users", "POST", { name, email, password, role, ...dept });
    setSaving(false);
    if (!r.ok) return setFormError(r.error);
    setOpen(false);
    refresh();
  }

  const columns: Column<UserRow>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email", render: (u) => <span className="ww-mono text-xs">{u.email}</span> },
    {
      key: "role",
      header: "Role",
      render: (u) => <StatusBadge label={ROLE_BADGES[u.role] ?? u.role} tone={u.role === "org_admin" ? "green" : "gray"} />,
    },
    { key: "departmentName", header: "Department" },
    { key: "createdAt", header: "Joined", render: (u) => new Date(u.createdAt).toLocaleDateString("en-GB") },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage your organization's users and permissions"
        action={<AddButton label="Add User" onClick={() => openForm(null)} />}
      />
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search name or email..."
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
        emptyText="No users found"
        actions={(u) =>
          u._id === currentUserId ? (
            <span className="ww-mono text-xs ww-muted">You</span>
          ) : (
            <RowActions onEdit={() => openForm(u)} onDelete={() => del.ask(u)} />
          )
        }
      />

      <Modal open={open} title={editing ? "Edit User" : "Add User"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Full name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </FormField>
          {!editing && (
            <>
              <FormField label="Email">
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </FormField>
              <FormField label="Temporary password">
                <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Min 8 characters" />
              </FormField>
            </>
          )}
          <FormField label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </FormField>
          {role === "department_manager" && (
            <FormField label="Department">
              <RemoteSelect endpoint="/api/departments" value={departmentId} onChange={setDepartmentId} placeholder="Select department" required />
            </FormField>
          )}
          <InlineError message={formError} />
          <FormButtons saving={saving} submitLabel={editing ? "Save changes" : "Create user"} onCancel={() => setOpen(false)} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!del.target}
        title="Delete user?"
        message={`${del.target?.name} (${del.target?.email}) will lose access immediately.`}
        busy={del.busy}
        error={del.error}
        onConfirm={del.confirm}
        onCancel={del.cancel}
      />
    </div>
  );
}