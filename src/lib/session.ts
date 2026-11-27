import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { Role } from "./rbac";

import { resetMongoClient } from "./mongodb";

function isNextBailoutError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[REDACTED_URI]");
  }
  return "Unknown error";
}

export async function getSession() {
  const reqHeaders = await headers();
  try {
    return await auth.api.getSession({ headers: reqHeaders });
  } catch (error) {
    if (isNextBailoutError(error)) {
      throw error;
    }

    // Retry once after resetting MongoClient in case of transient topology/connection drops
    try {
      resetMongoClient();
      return await auth.api.getSession({ headers: reqHeaders });
    } catch (retryError) {
      if (isNextBailoutError(retryError)) {
        throw retryError;
      }
      console.warn("[session] Failed to get session:", sanitizeErrorMessage(retryError));
      return null;
    }
  }
}

export async function getSessionUser() {
  const session = await getSession();
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