import { NextResponse } from "next/server";
import { Types } from "mongoose";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function isValidId(id: string) {
  return Types.ObjectId.isValid(id);
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parsePagination(url: URL, defaultLimit = 10) {
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function handleServerError(e: unknown) {
  if (typeof e === "object" && e && "code" in e && (e as { code: number }).code === 11000) {
    return apiError("This record already exists (duplicate)", 409);
  }
  if (e instanceof Error) {
    const safeMsg = e.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[REDACTED_URI]");
    const safeStack = e.stack?.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[REDACTED_URI]");
    console.error("[ServerError]:", safeMsg, safeStack ?? "");
  } else {
    console.error("[ServerError]:", e);
  }
  return apiError("Internal server error", 500);
}