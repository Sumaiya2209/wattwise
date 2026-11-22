import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId } from "@/lib/api";
import { Meter } from "@/models/Meter";
import { EnergyRecord } from "@/models/EnergyRecord";

type Ctx = { params: Promise<{ id: string }> };

const ROLES = ["org_admin", "facility_manager"] as const;

const schema = z.object({
  meterNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Meter number must be at least 3 characters")
    .max(30)
    .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and dashes only"),
  type: z.enum(["main", "sub"]),
  status: z.enum(["active", "inactive", "faulty"]),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, error } = await getApiUser([...ROLES]);
  if (error) return error;
  if (!isValidId(id)) return apiError("Invalid id");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    await connectDB();
    const doc = await Meter.findOneAndUpdate(
      { _id: id, organizationId: user.organizationId },
      parsed.data,
      { new: true }
    );
    if (!doc) return apiError("Meter not found", 404);
    return Response.json(doc);
  } catch (e) {
    return handleServerError(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, error } = await getApiUser([...ROLES]);
  if (error) return error;
  if (!isValidId(id)) return apiError("Invalid id");

  try {
    await connectDB();
    const meter = await Meter.findOne({ _id: id, organizationId: user.organizationId });
    if (!meter) return apiError("Meter not found", 404);

    // Historical energy record preserve korte hobe
    if (await EnergyRecord.exists({ meterId: id })) {
      return apiError("This meter has historical energy records. Set its status to Inactive instead of deleting.", 409);
    }
    await meter.deleteOne();
    return Response.json({ success: true });
  } catch (e) {
    return handleServerError(e);
  }
}