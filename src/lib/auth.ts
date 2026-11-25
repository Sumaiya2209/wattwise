import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI .env file e set kora nai");
}

// Hot reload e jate notun client na banay, global e cache kora
const globalForMongo = globalThis as unknown as {
  authMongoClient?: MongoClient;
};
const client = globalForMongo.authMongoClient ?? new MongoClient(uri);
globalForMongo.authMongoClient = client;

const db = client.db();

const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
  "https://wattwise-blond.vercel.app",
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
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