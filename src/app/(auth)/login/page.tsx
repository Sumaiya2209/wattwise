"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Lock,
  Mail,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import { signIn } from "@/lib/auth-client";
import ThemeToggle from "@/components/ThemeToggle";

const DEMO_PASSWORD = "Demo@1234";

const ROLES = [
  {
    key: "org_admin",
    title: "Org Admin",
    sub: "All Buildings",
    badge: "ORG ADMIN",
    hint: "Full System Control",
    email: "admin@brightedge.com",
    icon: Shield,
  },
  {
    key: "facility_manager",
    title: "Facility Mgr",
    sub: "Meters & Alerts",
    badge: "FACILITY MGR",
    hint: "Operations Control",
    email: "facility@brightedge.com",
    icon: SlidersHorizontal,
  },
  {
    key: "department_manager",
    title: "Dept Manager",
    sub: "Unit Cost & KPI",
    badge: "DEPT MANAGER",
    hint: "Department Insights",
    email: "dept@brightedge.com",
    icon: Layers,
  },
  {
    key: "viewer",
    title: "Viewer",
    sub: "Read-Only Audit",
    badge: "VIEWER",
    hint: "Read-Only Access",
    email: "viewer@brightedge.com",
    icon: Eye,
  },
] as const;

const inputWrap =
  "group flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 transition-all focus-within:border-emerald-500 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-emerald-500/60";
const inputCls =
  "w-full bg-transparent font-mono text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-600";
const inputIcon =
  "text-gray-400 group-focus-within:text-emerald-600 dark:text-gray-500 dark:group-focus-within:text-emerald-400";

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof ROLES)[number] | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);

  function pickRole(role: (typeof ROLES)[number]) {
    setSelected(role);
    setEmail(role.email);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn.email({
      email,
      password,
      rememberMe: remember,
    });
    if (error) {
      setLoading(false);
      const detail = error.message || error.statusText || "Sign-in failed";
      setError(error.status ? `${detail} (${error.status})` : detail);
      setShakeKey((k) => k + 1);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 transition-colors dark:bg-[#070b14]">

      <Link href="/" className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white/80 px-3 py-2 text-sm font-medium text-gray-700 backdrop-blur hover:text-emerald-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300">
        ← Home
      </Link>
      {/* theme toggle */}
      <ThemeToggle className="absolute right-4 top-4 z-10 border-gray-300 bg-white/80 text-gray-700 shadow-sm backdrop-blur hover:border-emerald-500 hover:text-emerald-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:border-emerald-500/60 dark:hover:text-emerald-400" />

      {/* animated background */}
      <div className="ww-grid pointer-events-none absolute inset-0" />
      <div className="ww-glow pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-emerald-400/30 blur-[120px] dark:bg-emerald-500/30" />
      <div
        className="ww-glow pointer-events-none absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-teal-400/25 blur-[120px] dark:bg-teal-500/25"
        style={{ animationDelay: "3s" }}
      />

      <div
        key={shakeKey}
        className={`relative w-full max-w-[430px] ${shakeKey ? "ww-shake" : ""}`}
      >
        <div className="ww-fade-up rounded-3xl border border-gray-200 bg-white/80 p-7 shadow-xl shadow-gray-300/50 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/50 sm:p-8">
          {/* header */}
          <div
            className="ww-fade-up flex items-start justify-between"
            style={{ animationDelay: "0.1s" }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome back
            </h1>
            <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-3 py-1 font-mono text-[10px] font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400">
              {selected?.badge ?? "SELECT ROLE"}
            </span>
          </div>
          <p
            className="ww-fade-up mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400"
            style={{ animationDelay: "0.15s" }}
          >
            Sign in to access your organization&apos;s real-time energy
            intelligence workspace.
          </p>

          {/* quick demo */}
          <div className="ww-fade-up mt-6" style={{ animationDelay: "0.2s" }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <Sparkles size={13} /> Quick demo access (1-click fill)
              </span>
              <span className="text-[11px] text-gray-500">
                {selected?.hint ?? "Choose a role to fill demo credentials"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = selected?.key === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => pickRole(r)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 ${active
                      ? "border-emerald-500/70 bg-emerald-50 shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)] dark:bg-emerald-500/10"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25"
                      }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${active
                        ? "bg-emerald-500 text-white dark:text-[#04120c]"
                        : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                        }`}
                    >
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {r.title}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-gray-500">
                        {r.sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="ww-fade-up" style={{ animationDelay: "0.3s" }}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                Work email address
              </label>
              <div className={inputWrap}>
                <Mail size={16} className={inputIcon} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div className="ww-fade-up" style={{ animationDelay: "0.35s" }}>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Security password
                </label>
                <button
                  type="button"
                  className="text-xs text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Reset credentials?
                </button>
              </div>
              <div className={inputWrap}>
                <Lock size={16} className={inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div
              className="ww-fade-up flex items-center justify-between text-xs"
              style={{ animationDelay: "0.4s" }}
            >
              <label className="flex cursor-pointer items-center gap-2 text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                Remember trusted terminal
              </label>
              <span className="font-mono text-gray-400 dark:text-gray-600">
                TLS 1.3
              </span>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="ww-btn ww-fade-up flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-[0_8px_30px_-6px_rgba(16,185,129,0.6)] transition-all hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:text-[#04120c] dark:hover:bg-emerald-400"
              style={{ animationDelay: "0.45s" }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Authenticate &amp; Launch Console <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* footer */}
          <div
            className="ww-fade-up mt-6 flex items-center justify-between border-t border-gray-200 pt-5 text-xs dark:border-white/10"
            style={{ animationDelay: "0.5s" }}
          >
            <span className="text-gray-500">Deploying a new facility network?</span>
            <Link
              href="/register"
              className="flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Provision Organization <ArrowUpRight size={13} />
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