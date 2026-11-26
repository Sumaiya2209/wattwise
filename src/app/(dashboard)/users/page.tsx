import { requireRole } from "@/lib/session";
import UsersClient from "./UsersClient";

export const instant = false;

export default async function UsersPage() {
  const user = await requireRole(["org_admin"]);
  return <UsersClient currentUserId={user.id} />;
}