import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { Role } from "./rbac";

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

// Page/layout er jonno
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowed: Role[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role as Role)) redirect("/dashboard");
  return user;
}

// API route er jonno (redirect na, JSON error dey)
export async function getApiUser(allowed?: Role[]) {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (allowed && !allowed.includes(user.role as Role)) {
    return { user: null, error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}