import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI .env file e set kora nai");
}

const mongoClientOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
};

// Global cache so serverless invocations and hot reload reuse the connection pool
const globalForMongo = globalThis as unknown as {
  authMongoClient?: MongoClient;
};

if (
  !globalForMongo.authMongoClient ||
  (globalForMongo.authMongoClient as unknown as { topology?: { isClosed?: () => boolean } }).topology?.isClosed?.()
) {
  globalForMongo.authMongoClient = new MongoClient(uri, mongoClientOptions);
}
const client = globalForMongo.authMongoClient;

const db = client.db();

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
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: mongodbAdapter(db),
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