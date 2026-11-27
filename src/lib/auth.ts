import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { resilientDb, resilientClient } from "./mongodb";

function normalizeAuthOrigin(value: string | undefined) {
  if (!value) return undefined;
  const withScheme = /^https?:\/\//i.test(value)
    ? value
    : `${/^(localhost|127(?:\.\d{1,3}){3})(:\d+)?(?:\/|$)/i.test(value) ? "http" : "https"}://${value}`;
  const url = new URL(withScheme);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Auth URL must use http:// or https://");
  }
  return url.origin;
}

const baseURL =
  normalizeAuthOrigin(process.env.BETTER_AUTH_URL) ??
  normalizeAuthOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
  normalizeAuthOrigin(process.env.VERCEL_URL) ??
  "http://localhost:3000";

const baseHostname = new URL(baseURL).hostname;
if (
  process.env.VERCEL &&
  (baseHostname === "localhost" || baseHostname === "127.0.0.1" || baseHostname === "::1")
) {
  throw new Error("On Vercel, BETTER_AUTH_URL must use the deployed public URL.");
}

const trustedOrigins = [
  baseURL,
  normalizeAuthOrigin(process.env.BETTER_AUTH_URL),
  normalizeAuthOrigin(process.env.NEXT_PUBLIC_APP_URL),
  normalizeAuthOrigin(process.env.VERCEL_URL),
  normalizeAuthOrigin(process.env.VERCEL_BRANCH_URL),
  normalizeAuthOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  "https://wattwise-blond.vercel.app",
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: mongodbAdapter(resilientDb, { client: resilientClient }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "viewer",
        input: false,
      },
      organizationId: { type: "string", required: false, input: false },
      departmentId: { type: "string", required: false, input: false },
    },
  },
});