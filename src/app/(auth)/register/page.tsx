"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Zap } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import FormField, { inputCls } from "@/components/FormField";
import { InlineError } from "@/components/FormButtons";
import { signIn } from "@/lib/auth-client";
import { sendJson } from "@/lib/client-api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    orgName: "",
    orgType: "office",
    tariff: "8",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const r = await sendJson("/api/registration", "POST", { ...form, tariff: Number(form.tariff) });
    if (!r.ok) {
      setLoading(false);
      return setError(r.error);
    }
    const { error: signInError } = await signIn.email({ email: form.email, password: form.password });
    if (signInError) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="ww-shell relative flex min-h-screen items-center justify-center overflow-hidden p-4 py-10">
      <div className="ww-grid pointer-events-none absolute inset-0" />
      <div className="ww-glow pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-emerald-400/30 blur-[120px] dark:bg-emerald-500/30" />
      <ThemeToggle className="ww-panel-2 ww-muted absolute right-4 top-4 z-10 hover:text-emerald-500" />

      <div className="ww-fade-up ww-panel relative w-full max-w-md p-7 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-500">
            <Zap size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[var(--ww-text)]">Provision Organization</h1>
            <p className="text-xs ww-muted">Create your organization and admin account</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <FormField label="Organization name">
            <input required value={form.orgName} onChange={set("orgName")} className={inputCls} placeholder="e.g. Apex Tech Campus" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <select value={form.orgType} onChange={set("orgType")} className={inputCls}>
                <option value="office">Office</option>
                <option value="factory">Factory</option>
                <option value="university">University</option>
                <option value="commercial">Commercial</option>
              </select>
            </FormField>
            <FormField label="Tariff (৳/kWh)">
              <input required type="number" min={0.1} step="any" value={form.tariff} onChange={set("tariff")} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Your name">
            <input required value={form.name} onChange={set("name")} className={inputCls} />
          </FormField>
          <FormField label="Work email">
            <input required type="email" value={form.email} onChange={set("email")} className={inputCls} />
          </FormField>
          <FormField label="Password">
            <input required type="password" minLength={8} value={form.password} onChange={set("password")} className={inputCls} placeholder="Min 8 characters" />
          </FormField>

          <InlineError message={error} />
          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 dark:text-[#04120c]"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Creating..." : "Create organization"}
          </button>
        </form>

        <Link href="/login" className="mt-5 flex items-center justify-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </main>
  );
}