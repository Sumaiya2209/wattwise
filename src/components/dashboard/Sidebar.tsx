"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  Cpu,
  Database,
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Network,
  Sparkles,
  User,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { fmtNum } from "@/lib/format";
import { NAV_GROUPS, NAV_ITEMS, ROLE_LABELS, type Role } from "@/lib/rbac";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  insights: Sparkles,
  alerts: Bell,
  meters: Cpu,
  buildings: Building2,
  floors: Layers,
  departments: Network,
  users: Users,
  records: Database,
  reports: FileText,
  profile: User,
};

export type SidebarOrg = {
  name: string;
  tariff: number;
  buildings: number;
  floors: number;
  meters: number;
  records: number;
};

export default function Sidebar({
  user,
  org,
  alertsNew,
  open,
  onClose,
}: {
  user: { name: string; role: Role };
  org: SidebarOrg;
  alertsNew: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const { error } = await signOut();
      if (error) {
        console.error("[auth] Sign out failed:", error.message);
        setSignOutError("Could not sign out. Please try again.");
        return;
      }
      window.location.replace("/login");
    } catch (error) {
      console.error("[auth] Sign out request failed:", error);
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--ww-border)] bg-[var(--ww-panel)] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <Link
            href="/"
            onClick={onClose}
            aria-label="WattWise home"
            className="flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-500">
              <Zap size={22} />
            </span>
            <div>
              <p className="text-xl font-bold leading-tight text-[var(--ww-text)]">WattWise</p>
              <p className="text-xs ww-muted">Energy Intelligence</p>
            </div>
          </Link>
          <button onClick={onClose} className="rounded-lg p-1.5 ww-muted hover:bg-[var(--ww-panel2)] lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Active org */}
        <div className="px-4">
          <div className="ww-panel-2 rounded-2xl p-4">
            <p className="ww-eyebrow flex items-center justify-between">
              <span>Active organization</span>
              <span className="flex items-center gap-1 !text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Synced
              </span>
            </p>
            <p className="mt-2 truncate font-semibold text-[var(--ww-text)]">{org.name}</p>
            <p className="ww-mono mt-2 text-[11px] ww-muted">
              {org.buildings} Buildings · {org.floors} Floors · {org.meters} Meters
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {NAV_GROUPS.map((group) => {
            const groupItems = items.filter((i) => i.group === group);
            if (groupItems.length === 0) return null;
            return (
              <div key={group}>
                <p className="ww-eyebrow mb-2 px-2">{group}</p>
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const Icon = ICONS[item.icon] ?? LayoutDashboard;
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    const badge = item.href === "/alerts" && alertsNew > 0 ? alertsNew : 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-[var(--ww-text)] hover:bg-[var(--ww-panel2)]"
                        }`}
                      >
                        <Icon size={18} className={active ? "" : "ww-muted"} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {badge > 0 && (
                          <span className="rounded-md bg-emerald-500 px-1.5 text-xs font-bold text-white dark:text-[#04120c]">
                            {badge}
                          </span>
                        )}
                        {active && badge === 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-3 border-t border-[var(--ww-border)] p-4">
          {signOutError && (
            <p role="alert" className="text-xs text-red-500">
              {signOutError}
            </p>
          )}
          <div className="ww-panel-2 rounded-2xl p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ww-text)]">
              <Database size={15} className="text-emerald-500" /> Time-Series Engine
            </p>
            <p className="ww-mono mt-1.5 text-[11px] ww-muted">{fmtNum(org.records)} records indexed</p>
            <p className="ww-mono mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              Tariff: ৳{org.tariff} / kWh
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ww-text)]">{user.name}</p>
              <p className="truncate text-xs ww-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title={signingOut ? "Signing out..." : "Sign out"}
              disabled={signingOut}
              className="rounded-lg p-2 ww-muted hover:bg-red-500/10 hover:text-red-500 disabled:cursor-wait disabled:opacity-50"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}