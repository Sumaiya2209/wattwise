"use client";

import { useState } from "react";
import { KeyRound, Loader2, RotateCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";

type InviteRole = "manager" | "employee";

export default function InviteCodeCard() {
  const [inviteCodes, setInviteCodes] = useState<Partial<Record<InviteRole, string>>>({});
  const [error, setError] = useState("");
  const [loadingRole, setLoadingRole] = useState<InviteRole | null>(null);

  async function generateCode(role: InviteRole) {
    setLoadingRole(role);
    setError("");

    try {
      const response = await fetch("/api/organizations/invite-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate an invitation code");
      }

      setInviteCodes((codes) => ({ ...codes, [role]: data.inviteCode }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate an invitation code",
      );
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Organization users"
        subtitle="Invite managers and employees to join your WattWise workspace"
      />

      <section className="ww-panel max-w-2xl p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
            <KeyRound size={20} />
          </span>
          <div>
            <h2 className="font-semibold text-[var(--ww-text)]">Registration invitation code</h2>
            <p className="mt-1 text-sm ww-muted">
              Generate a role-specific code for each person you invite. Managers get facility-manager
              access; Employees get read-only access.
            </p>
          </div>
        </div>

        {(["manager", "employee"] as const).map((role) => (
          <div key={role} className="mt-5 rounded-xl border border-[var(--ww-border)] bg-[var(--ww-panel2)] p-4">
            <p className="ww-eyebrow">{role} invitation code</p>
            {inviteCodes[role] ? (
              <code className="mt-2 block break-all text-sm font-semibold text-[var(--ww-text)]">
                {inviteCodes[role]}
              </code>
            ) : (
              <p className="mt-2 text-sm ww-muted">No code generated yet</p>
            )}
            <button
              type="button"
              onClick={() => generateCode(role)}
              disabled={loadingRole !== null}
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 dark:text-[#04120c]"
            >
              {loadingRole === role ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
              {inviteCodes[role] ? "Generate a new code" : "Generate invite code"}
            </button>
          </div>
        ))}

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <p className="mt-3 text-xs ww-muted">
          A code only permits registration for its assigned role. Generating a new code for a role
          immediately invalidates the previous code for that role.
        </p>
      </section>
    </div>
  );
}
