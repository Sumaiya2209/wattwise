import { requireUser } from "@/lib/session";
import type { Role } from "@/lib/rbac";
import RecordsClient from "./RecordsClient";

export default async function RecordsPage() {
  const user = await requireUser();
  return <RecordsClient role={user.role as Role} />;
}