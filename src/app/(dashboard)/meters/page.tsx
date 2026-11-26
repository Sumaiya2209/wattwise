import { requireRole } from "@/lib/session";
import MetersClient from "./MetersClient";

export const instant = false;

export default async function MetersPage() {
  await requireRole(["org_admin", "facility_manager"]);
  return <MetersClient />;
}