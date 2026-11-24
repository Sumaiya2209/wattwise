import { z } from "zod";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { usersCol } from "@/lib/users-db";
import { apiError, handleServerError } from "@/lib/api";
import { Organization } from "@/models/Organization";

const schema = z.object({
  orgName: z.string().trim().min(2, "Organization name is too short").max(100),
  orgType: z.enum(["office", "factory", "university", "commercial"]),
  tariff: z.number().min(0.1, "Tariff must be positive").max(1000),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

// Public endpoint: role shobshomoy org_admin, user role choose korte parbe na
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const { orgName, orgType, tariff, name, email, password } = parsed.data;

  try {
    await connectDB();
    const col = usersCol();
    if (await col.findOne({ email })) return apiError("An account with this email already exists", 409);

    const org = await Organization.create({
      name: orgName,
      type: orgType,
      tariffPerKwh: tariff,
      contactEmail: email,
    });

    try {
      await auth.api.signUpEmail({ body: { email, password, name } });
      await col.updateOne({ email }, { $set: { role: "org_admin", organizationId: String(org._id) } });
    } catch (e) {
      await Organization.deleteOne({ _id: org._id }); // adha-adhi toiri hobe na
      return apiError(e instanceof Error ? e.message : "Could not create account", 400);
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (e) {
    return handleServerError(e);
  }
}