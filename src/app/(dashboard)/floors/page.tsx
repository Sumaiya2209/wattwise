import { requireRole } from "@/lib/session";
import FloorsClient from "./FloorsClient";

export const instant = false;

export default async function FloorsPage() {
  await requireRole(["org_admin"]);
  return <FloorsClient />;
}