import { requireRole } from "@/lib/session";
import FloorsClient from "./FloorsClient";

export default async function FloorsPage() {
  await requireRole(["org_admin"]);
  return <FloorsClient />;
}