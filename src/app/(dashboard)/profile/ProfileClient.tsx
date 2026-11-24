"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField, { inputCls } from "@/components/FormField";
import FormButtons, { InlineError } from "@/components/FormButtons";
import PageHeader from "@/components/PageHeader";
import { authClient } from "@/lib/auth-client";
import { ROLE_LABELS, type Role } from "@/lib/rbac";

export default function ProfileClient({
  name: initialName,
  email,
  role,
  orgName,
  departmentName,
}: {
  name: string;
  email: string;
  role: string;
  orgName: string;
  departmentName: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [nameMsg, setNameMsg] = useState({ ok: false, text: "" });
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState({ ok: false, text: "" });
  const [savingPw, setSavingPw] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg({ ok: false, text: "" });
    const { error } = await authClient.updateUser({ name: name.trim() });
    setSavingName(false);
    if (error) return setNameMsg({ ok: false, text: error.message ?? "Update failed" });
    setNameMsg({ ok: true, text: "Name updated" });
    router.refresh(); // sidebar e notun naam
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg({ ok: false, text: "" });
    if (next.length < 8) return setPwMsg({ ok: false, text: "New password must be at least 8 characters" });
    if (next !== confirm) return setPwMsg({ ok: false, text: "Passwords do not match" });
    setSavingPw(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setSavingPw(false);
    if (error) return setPwMsg({ ok: false, text: error.message ?? "Could not change password" });
    setPwMsg({ ok: true, text: "Password changed" });
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  const msgCls = (ok: boolean) =>
    ok
      ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
      : "";

  return (
    <div>
      <PageHeader title="Profile Settings" subtitle="Manage your account details and password" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="ww-panel p-6">
          <h2 className="text-lg font-bold text-[var(--ww-text)]">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Email", email],
              ["Role", ROLE_LABELS[role as Role] ?? role],
              ["Organization", orgName],
              ...(departmentName ? [["Department", departmentName]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="ww-muted">{k}</dt>
                <dd className="break-all text-right font-medium text-[var(--ww-text)]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <form onSubmit={saveName} className="ww-panel space-y-4 p-6">
          <h2 className="text-lg font-bold text-[var(--ww-text)]">Display name</h2>
          <FormField label="Full name">
            <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </FormField>
          {nameMsg.text &&
            (nameMsg.ok ? <p className={msgCls(true)}>{nameMsg.text}</p> : <InlineError message={nameMsg.text} />)}
          <FormButtons saving={savingName} submitLabel="Save name" onCancel={() => setName(initialName)} />
        </form>

        <form onSubmit={savePassword} className="ww-panel space-y-4 p-6">
          <h2 className="text-lg font-bold text-[var(--ww-text)]">Change password</h2>
          <FormField label="Current password">
            <input required type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="New password">
            <input required type="password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} placeholder="Min 8 characters" />
          </FormField>
          <FormField label="Confirm new password">
            <input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
          </FormField>
          {pwMsg.text && (pwMsg.ok ? <p className={msgCls(true)}>{pwMsg.text}</p> : <InlineError message={pwMsg.text} />)}
          <FormButtons
            saving={savingPw}
            submitLabel="Update password"
            onCancel={() => {
              setCurrent("");
              setNext("");
              setConfirm("");
            }}
          />
        </form>
      </div>
    </div>
  );
}