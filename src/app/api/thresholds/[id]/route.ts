import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId } from "@/lib/api";
import { Threshold } from "@/models/Threshold";

type Ctx = { params: Promise<{ id: string }> };

const ROLES = ["org_admin", "facility_manager"] as const;

const schema = z
  .object({
    limitKwh: z.number().positive("Limit must be greater than 0").max(10_000_000, "Limit is too large").optional(),
    period: z.enum(["hourly", "daily"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, error } = await getApiUser([...ROLES]);
  if (error) return error;
  if (!isValidId(id)) return apiError("Invalid id");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const { limitKwh, period, isActive } = parsed.data;

  try {
    await connectDB();
    const th = await Threshold.findOne({ _id: id, organizationId: user.organizationId });
    if (!th) return apiError("Threshold not found", 404);

    if (period && period !== th.period) {
      const target = th.scope === "meter" ? { meterId: th.meterId } : { buildingId: th.buildingId };
      const clash = await Threshold.exists({
        organizationId: user.organizationId,
        scope: th.scope,
        ...target,
        period,
        _id: { $ne: th._id },
      });
      if (clash) return apiError(`A ${period} limit already exists for this target`, 409);
      th.period = period;
    }
    if (limitKwh !== undefined) th.limitKwh = Math.round(limitKwh * 100) / 100;
    if (isActive !== undefined) th.isActive = isActive;

    await th.save();
    return Response.json(th);
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
    // Alert history thakbe, shudhu limit ta muche jabe
    const doc = await Threshold.findOneAndDelete({ _id: id, organizationId: user.organizationId });
    if (!doc) return apiError("Threshold not found", 404);
    return Response.json({ success: true });
  } catch (e) {
    return handleServerError(e);
  }
}