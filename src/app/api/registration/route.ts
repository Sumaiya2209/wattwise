import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { apiError, handleServerError } from "@/lib/api";
import { Organization } from "@/models/Organization";

const commonFields = {
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email address").transform((email) => email.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
};

const schema = z.discriminatedUnion("role", [
  z.object({
    ...commonFields,
    role: z.literal("org_admin"),
    organizationName: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100),
    organizationType: z.enum(["office", "factory", "university", "commercial"]),
    address: z.string().trim().max(200).optional(),
  }).strict(),
  z.object({
    ...commonFields,
    role: z.enum(["manager", "employee"]),
    inviteCode: z.string().trim().min(1, "An organization invitation code is required").max(100),
  }).strict(),
]);

const RBAC_ROLE = {
  org_admin: "org_admin",
  manager: "facility_manager",
  employee: "viewer",
} as const;

function hashInviteCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection is unavailable");

    const users = db.collection("user");
    const existingUser = await users.findOne({ email: parsed.data.email });
    if (existingUser) return apiError("An account already uses this email", 409);

    let organizationId: string;
    let createdOrganizationId: mongoose.Types.ObjectId | null = null;

    if (parsed.data.role === "org_admin") {
      const existingOrganization = await Organization.findOne({
        contactEmail: parsed.data.email,
      }).lean();
      if (existingOrganization) {
        return apiError("An organization already uses this email", 409);
      }

      const organization = await Organization.create({
        name: parsed.data.organizationName,
        type: parsed.data.organizationType,
        address: parsed.data.address || undefined,
        contactEmail: parsed.data.email,
      });
      organizationId = organization._id.toString();
      createdOrganizationId = organization._id;
    } else {
      const organization = await Organization.findOne({
        [`${parsed.data.role}InviteCodeHash`]: hashInviteCode(parsed.data.inviteCode),
      }).select("_id").lean();
      if (!organization) return apiError("Invalid organization invitation code", 403);
      organizationId = organization._id.toString();
    }

    let createdUserId: string | null = null;
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
        },
      });
      createdUserId = result.user.id;

      const update = await users.updateOne(
        { email: parsed.data.email },
        {
          $set: {
            role: RBAC_ROLE[parsed.data.role],
            organizationId,
          },
        },
      );
      if (update.matchedCount !== 1) {
        throw new Error("The new account could not be linked to its organization");
      }
    } catch (error) {
      if (createdUserId) {
        await Promise.all([
          db.collection("account").deleteMany({ userId: createdUserId }),
          users.deleteOne({ email: parsed.data.email }),
        ]);
      }
      if (createdOrganizationId) {
        await Organization.deleteOne({ _id: createdOrganizationId });
      }
      throw error;
    }

    return Response.json({ organizationId }, { status: 201 });
  } catch (error) {
    return handleServerError(error);
  }
}
