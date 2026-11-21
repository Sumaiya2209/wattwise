import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId } from "@/lib/api";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  address: z.string().trim().max(200).optional(),
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
    const doc = await Building.findOneAndUpdate(
      { _id: id, organizationId: user.organizationId }, // onno org er data touch korte parbe na
      { name: parsed.data.name, address: parsed.data.address ?? "" },
      { new: true }
    );
    if (!doc) return apiError("Building not found", 404);
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
    // data integrity: floor thakle delete hobe na (historical data preserve)
    if (await Floor.exists({ buildingId: id, organizationId: user.organizationId })) {
      return apiError("Delete this building's floors first", 409);
    }
    const doc = await Building.findOneAndDelete({
      _id: id,
      organizationId: user.organizationId,
    });
    if (!doc) return apiError("Building not found", 404);
    return Response.json({ success: true });
  } catch (e) {
    return handleServerError(e);
  }
}