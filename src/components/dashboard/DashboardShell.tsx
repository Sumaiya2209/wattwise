"use client";

import { Suspense, useState } from "react";
import Sidebar, { type SidebarOrg } from "./Sidebar";
import Topbar from "./Topbar";
import type { Role } from "@/lib/rbac";

export default function DashboardShell({
  children,
  user,
  org,
  alertsNew,
}: {
  children: React.ReactNode;
  user: { name: string; role: Role };
  org: SidebarOrg;
  alertsNew: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ww-shell min-h-screen">
      <Sidebar user={user} org={org} alertsNew={alertsNew} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-72">
        <Suspense fallback={<div className="h-[61px] border-b border-[var(--ww-border)]" />}>
          <Topbar role={user.role} onMenu={() => setOpen(true)} />
        </Suspense>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}