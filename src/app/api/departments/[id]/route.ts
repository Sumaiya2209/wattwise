import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId } from "@/lib/api";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
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
    const dept = await Department.findOne({ _id: id, organizationId: user.organizationId });
    if (!dept) return apiError("Department not found", 404);

    const clash = await Department.exists({
      floorId: dept.floorId,
      name: parsed.data.name,
      _id: { $ne: dept._id },
    });
    if (clash) return apiError("A department with this name already exists on this floor", 409);

    dept.name = parsed.data.name;
    await dept.save();
    return Response.json(dept);
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
    const dept = await Department.findOne({ _id: id, organizationId: user.organizationId });
    if (!dept) return apiError("Department not found", 404);
    if (await Meter.exists({ departmentId: id })) {
      return apiError("Remove this department's meters first", 409);
    }
    await dept.deleteOne();
    return Response.json({ success: true });
  } catch (e) {
    return handleServerError(e);
  }
}