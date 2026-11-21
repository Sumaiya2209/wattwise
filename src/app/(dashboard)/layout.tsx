import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/session";
import type { Role } from "@/lib/rbac";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-gray-950">
      <Sidebar name={user.name} role={user.role as Role} />
      <main className="p-4 pt-16 md:ml-64 md:p-8 md:pt-8">{children}</main>
    </div>
  );
}