"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { NAV_ITEMS, ROLE_LABELS, type Role } from "@/lib/rbac";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar({
  name,
  role,
}: {
  name: string;
  role: Role;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-3 top-3 z-40 rounded-lg bg-gray-900 px-3 py-2 text-white md:hidden"
      >
        ☰
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gray-900 text-gray-200 transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="px-5 py-5 text-xl font-bold text-white">⚡ WattWise</div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-emerald-600 text-white" : "hover:bg-gray-800"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <p className="mb-3 text-xs text-gray-400">{ROLE_LABELS[role]}</p>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">Theme</span>
            <ThemeToggle className="h-8 w-8 border-gray-700 bg-gray-800 text-gray-300 hover:text-emerald-400" />
          </div>
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg bg-gray-800 py-2 text-sm hover:bg-gray-700"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}