import { requireRole } from "@/lib/session";
import AlertsClient from "./AlertsClient";

export default async function AlertsPage() {
  await requireRole(["org_admin", "facility_manager"]);
  return <AlertsClient />;
}