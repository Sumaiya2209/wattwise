"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  User,
  Zap,
} from "lucide-react";
import { signIn } from "@/lib/auth-client";
import ThemeToggle from "@/components/ThemeToggle";

type RegistrationRole = "org_admin" | "manager" | "employee";
type RegistrationForm = {
  role: RegistrationRole;
  name: string;
  organizationName: string;
  organizationType: string;
  address: string;
  inviteCode: string;
  email: string;
  password: string;
};

const inputWrap =
  "group flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 transition-all focus-within:border-emerald-500 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-emerald-500/60";
const inputCls =
  "w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-600";
const inputIcon =
  "text-gray-400 group-focus-within:text-emerald-600 dark:text-gray-500 dark:group-focus-within:text-emerald-400";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [form, setForm] = useState<RegistrationForm>({
    role: "org_admin",
    name: "",
    organizationName: "",
    organizationType: "office",
    address: "",
    inviteCode: "",
    email: "",
    password: "",
  });

  function updateField<K extends keyof RegistrationForm>(field: K, value: RegistrationForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      setShakeKey((key) => key + 1);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          form.role === "org_admin"
            ? {
                role: form.role,
                name: form.name,
                email: form.email,
                password: form.password,
                organizationName: form.organizationName,
                organizationType: form.organizationType,
                address: form.address,
              }
            : {
                role: form.role,
                name: form.name,
                email: form.email,
                password: form.password,
                inviteCode: form.inviteCode,
              },
        ),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create account");
      }

      const { error: signInError } = await signIn.email({
        email: form.email,
        password: form.password,
        rememberMe: true,
      });

      if (signInError) {
        throw new Error(signInError.message || "Account created. Please sign in.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account");
      setShakeKey((key) => key + 1);
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 transition-colors dark:bg-[#070b14]">
      <ThemeToggle className="absolute right-4 top-4 z-10 border-gray-300 bg-white/80 text-gray-700 shadow-sm backdrop-blur hover:border-emerald-500 hover:text-emerald-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:border-emerald-500/60 dark:hover:text-emerald-400" />

      <div className="ww-grid pointer-events-none absolute inset-0" />
      <div className="ww-glow pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-emerald-400/30 blur-[120px] dark:bg-emerald-500/30" />
      <div
        className="ww-glow pointer-events-none absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-teal-400/25 blur-[120px] dark:bg-teal-500/25"
        style={{ animationDelay: "3s" }}
      />

      <div key={shakeKey} className={`relative w-full max-w-[520px] ${shakeKey ? "ww-shake" : ""}`}>
        <div className="ww-fade-up rounded-3xl border border-gray-200 bg-white/80 p-7 shadow-xl shadow-gray-300/50 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/50 sm:p-8">
          <div className="ww-fade-up flex items-start justify-between" style={{ animationDelay: "0.1s" }}>
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                <Zap size={13} /> WattWise Network
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {form.role === "org_admin" ? "Create organization" : "Join your organization"}
              </h1>
            </div>
            <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-3 py-1 font-mono text-[10px] font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400">
              {form.role === "org_admin" ? "ORG ADMIN" : form.role.toUpperCase()}
            </span>
          </div>
          <p className="ww-fade-up mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400" style={{ animationDelay: "0.15s" }}>
            {form.role === "org_admin"
              ? "Provision a new workspace and your organization administrator account."
              : "Use the invitation code shared by your organization administrator to join the workspace."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="ww-fade-up" style={{ animationDelay: "0.18s" }}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                Account role
              </label>
              <select
                value={form.role}
                onChange={(event) => {
                  const role = event.target.value;
                  if (role === "org_admin" || role === "manager" || role === "employee") {
                    updateField("role", role);
                  }
                }}
                className="h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition-all focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] dark:border-white/10 dark:bg-[#101722] dark:text-white"
              >
                <option value="org_admin">Organization Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Manager accounts can manage meters and alerts. Employee accounts have read-only access.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ww-fade-up" style={{ animationDelay: "0.2s" }}>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Full name
                </label>
                <div className={inputWrap}>
                  <User size={16} className={inputIcon} />
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className={inputCls}
                    placeholder="Alex Morgan"
                  />
                </div>
              </div>

              <div className="ww-fade-up" style={{ animationDelay: "0.25s" }}>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Work email
                </label>
                <div className={inputWrap}>
                  <Mail size={16} className={inputIcon} />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className={inputCls}
                    placeholder="alex@company.com"
                  />
                </div>
              </div>
            </div>

            {form.role === "org_admin" ? (
              <>
                <div className="ww-fade-up" style={{ animationDelay: "0.3s" }}>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                    Organization name
                  </label>
                  <div className={inputWrap}>
                    <Building2 size={16} className={inputIcon} />
                    <input
                      required
                      value={form.organizationName}
                      onChange={(event) => updateField("organizationName", event.target.value)}
                      className={inputCls}
                      placeholder="BrightEdge Energy"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="ww-fade-up" style={{ animationDelay: "0.35s" }}>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Organization type
                    </label>
                    <select
                      value={form.organizationType}
                      onChange={(event) => updateField("organizationType", event.target.value)}
                      className="h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition-all focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] dark:border-white/10 dark:bg-[#101722] dark:text-white"
                    >
                      <option value="office">Office</option>
                      <option value="factory">Factory</option>
                      <option value="university">University</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>

                  <div className="ww-fade-up" style={{ animationDelay: "0.4s" }}>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <div className={inputWrap}>
                      <MapPin size={16} className={inputIcon} />
                      <input
                        value={form.address}
                        onChange={(event) => updateField("address", event.target.value)}
                        className={inputCls}
                        placeholder="Dhaka, Bangladesh"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="ww-fade-up" style={{ animationDelay: "0.3s" }}>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Organization invitation code
                </label>
                <div className={inputWrap}>
                  <KeyRound size={16} className={inputIcon} />
                  <input
                    required
                    value={form.inviteCode}
                    onChange={(event) => updateField("inviteCode", event.target.value)}
                    className={inputCls}
                    placeholder="Paste the code from your admin"
                    autoCapitalize="none"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            <div className="ww-fade-up" style={{ animationDelay: "0.45s" }}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className={inputWrap}>
                <Lock size={16} className={inputIcon} />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  className={inputCls}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="ww-btn ww-fade-up flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-[0_8px_30px_-6px_rgba(16,185,129,0.6)] transition-all hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:text-[#04120c] dark:hover:bg-emerald-400"
              style={{ animationDelay: "0.5s" }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {form.role === "org_admin" ? "Provisioning workspace..." : "Creating account..."}
                </>
              ) : (
                <>
                  {form.role === "org_admin" ? "Create organization" : "Join organization"} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="ww-fade-up mt-6 flex items-center justify-between border-t border-gray-200 pt-5 text-xs dark:border-white/10" style={{ animationDelay: "0.55s" }}>
            <span className="text-gray-500">Already have a workspace?</span>
            <Link
              href="/login"
              className="flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Sign in <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-600">
          <Zap size={12} className="text-emerald-500" /> WattWise Energy Intelligence
        </p>
      </div>
    </main>
  );
}