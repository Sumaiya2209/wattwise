import { requireRole } from "@/lib/session";
import DepartmentsClient from "./DepartmentsClient";

export default async function DepartmentsPage() {
  await requireRole(["org_admin"]);
  return <DepartmentsClient />;
}