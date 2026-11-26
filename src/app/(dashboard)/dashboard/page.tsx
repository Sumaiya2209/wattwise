import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import type { Role } from "@/lib/rbac";
import DashboardClient from "./DashboardClient";

export const instant = false;

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <Suspense fallback={null}>
      <DashboardClient role={user.role as Role} />
    </Suspense>
  );
}