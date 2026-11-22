import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId } from "@/lib/api";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(1, "Floor name is required").max(60),
  level: z.number().int("Level must be a whole number").min(0, "Level can't be negative").max(200),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, error } = await getApiUser(["org_admin"]);
  if (error) return error;
  if (!isValidId(id)) return apiError("Invalid id");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    await connectDB();
    const doc = await Floor.findOneAndUpdate(
      { _id: id, organizationId: user.organizationId },
      parsed.data,
      { new: true }
    );
    if (!doc) return apiError("Floor not found", 404);
    return Response.json(doc);
  } catch (e) {
    return handleServerError(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, error } = await getApiUser(["org_admin"]);
  if (error) return error;
  if (!isValidId(id)) return apiError("Invalid id");

  try {
    await connectDB();
    const floor = await Floor.findOne({ _id: id, organizationId: user.organizationId });
    if (!floor) return apiError("Floor not found", 404);
    if (await Department.exists({ floorId: id })) {
      return apiError("Delete this floor's departments first", 409);
    }
    await floor.deleteOne();
    await Building.updateOne(
      { _id: floor.buildingId },
      { totalFloors: await Floor.countDocuments({ buildingId: floor.buildingId }) }
    );
    return Response.json({ success: true });
  } catch (e) {
    return handleServerError(e);
  }
}