"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, ShieldCheck } from "lucide-react";
import Segmented from "@/components/Segmented";
import ThemeToggle from "@/components/ThemeToggle";
import { useList } from "@/hooks/useList";
import { NAV_ITEMS, ROLE_BADGES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/rbac";

type RangeKey = "today" | "7d" | "30d" | "custom";

const selectCls =
  "ww-panel-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ww-text)] outline-none focus:border-emerald-500";

function Filters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const range = (sp.get("range") ?? "30d") as RangeKey;
  const building = sp.get("building") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  const { rows: buildings } = useList<{ _id: string; name: string }>("/api/buildings", {
    page: 1,
    limit: 100,
  });

  function update(patch: Record<string, string>) {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented<RangeKey>
        value={range}
        onChange={(v) => update({ range: v, ...(v !== "custom" ? { from: "", to: "" } : {}) })}
        options={[
          { value: "today", label: "Today" },
          { value: "7d", label: "7 Days" },
          { value: "30d", label: "30 Days" },
          { value: "custom", label: "Custom" },
        ]}
      />
      <select
        value={building}
        onChange={(e) => update({ building: e.target.value })}
        className={selectCls}
        aria-label="Building filter"
      >
        <option value="">All Buildings ({buildings.length})</option>
        {buildings.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
          </option>
        ))}
      </select>
      {range === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => update({ from: e.target.value })} className={selectCls} />
          <span className="ww-muted">→</span>
          <input type="date" value={to} onChange={(e) => update({ to: e.target.value })} className={selectCls} />
        </div>
      )}
    </div>
  );
}

export default function Topbar({ role, onMenu }: { role: Role; onMenu: () => void }) {
  const pathname = usePathname();
  const showFilters = pathname.startsWith("/dashboard") || pathname.startsWith("/analytics");
  const title =
    NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))?.label ?? "WattWise";

  return (
    <header
      className="sticky top-0 z-20 border-b border-[var(--ww-border)] backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--ww-bg) 85%, transparent)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="ww-panel-2 rounded-xl p-2.5 text-[var(--ww-text)] lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1">
          {showFilters ? <Filters /> : <h1 className="truncate text-lg font-bold text-[var(--ww-text)]">{title}</h1>}
        </div>

        <div className="ww-panel-2 hidden items-center gap-2 rounded-xl px-3 py-2 text-sm sm:flex">
          <ShieldCheck size={15} className="text-emerald-500" />
          <span className="ww-eyebrow">Role</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{ROLE_LABELS[role]}</span>
        </div>
        <ThemeToggle className="ww-panel-2 ww-muted hover:text-emerald-500" />
      </div>

      <div className="hidden items-center gap-3 border-t border-[var(--ww-border)] px-4 py-2 text-sm sm:px-6 md:flex lg:px-8">
        <span className="ww-mono rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          {ROLE_BADGES[role]}
        </span>
        <span className="truncate ww-muted">{ROLE_DESCRIPTIONS[role]}</span>
      </div>
    </header>
  );
}