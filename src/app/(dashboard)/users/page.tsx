import { requireRole } from "@/lib/session";
import InviteCodeCard from "./InviteCodeCard";

export default async function UsersPage() {
  await requireRole(["org_admin"]);
  return <InviteCodeCard />;
}
