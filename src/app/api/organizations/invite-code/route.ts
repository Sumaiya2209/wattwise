import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getApiUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { apiError, handleServerError } from "@/lib/api";
import { Organization } from "@/models/Organization";

const schema = z.object({
  role: z.enum(["manager", "employee"]),
});

export async function POST(request: Request) {
  const { user, error } = await getApiUser(["org_admin"]);
  if (error) return error;
  if (!user.organizationId) return apiError("Your account is not associated with an organization", 400);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    await connectDB();
    const inviteCode = randomBytes(32).toString("base64url");
    const inviteCodeHash = createHash("sha256").update(inviteCode).digest("hex");
    const inviteHashField = `${parsed.data.role}InviteCodeHash`;
    const organization = await Organization.findByIdAndUpdate(
      user.organizationId,
      { $set: { [inviteHashField]: inviteCodeHash } },
      { new: true, select: "_id" },
    ).lean();

    if (!organization) return apiError("Organization not found", 404);
    return Response.json({ inviteCode, role: parsed.data.role });
  } catch (error) {
    return handleServerError(error);
  }
}
