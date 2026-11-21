import { requireRole } from "@/lib/session";
import BuildingsClient from "./BuildingsClient";

export default async function BuildingsPage() {
  await requireRole(["org_admin"]);
  return <BuildingsClient />;
}