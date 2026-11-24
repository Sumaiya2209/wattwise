import { Types } from "mongoose";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { usersCol } from "@/lib/users-db";
import { apiError, handleServerError, isValidId } from "@/lib/api";
import { Department } from "@/models/Department";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
  role: z.enum(["org_admin", "facility_manager", "department_manager", "viewer"]).optional(),
  departmentId: z.string().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, error } = await getApiUser(["org_admin"]);
  if (error) return error;
  if (!isValidId(id)) return apiError("Invalid id");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const { name, role, departmentId } = parsed.data;
  const orgId = String(user.organizationId);

  try {
    await connectDB();
    const col = usersCol();
    const target = await col.findOne({ _id: new Types.ObjectId(id), organizationId: orgId });
    if (!target) return apiError("User not found", 404);

    if (id === user.id && role && role !== target.role) {
      return apiError("You can't change your own role", 400);
    }

    const newRole = role ?? (target.role as string);
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ""> = {};
    if (name) $set.name = name;
    if (role) $set.role = role;

    if (newRole === "department_manager") {
      const dept = departmentId ?? (target.departmentId as string | undefined);
      if (!dept || !isValidId(dept)) return apiError("Select a department for the department manager");
      if (!(await Department.exists({ _id: dept, organizationId: orgId }))) return apiError("Department not found", 404);
      $set.departmentId = dept;
    } else {
      $unset.departmentId = "";
    }

    await col.updateOne(
      { _id: target._id },
      { $set, ...(Object.keys($unset).length ? { $unset } : {}) }
    );
    return Response.json({ success: true });
  } catch (e) {
    return handleServerError(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, error } = await getApiUser(["org_admin"]);
  if (error) return error;
  if (!isValidId(id)) return apiError("Invalid id");
  if (id === user.id) return apiError("You can't delete your own account", 400);

  try {
    await connectDB();
    const oid = new Types.ObjectId(id);
    const col = usersCol();
    const target = await col.findOne({ _id: oid, organizationId: String(user.organizationId) });
    if (!target) return apiError("User not found", 404);

    await col.deleteOne({ _id: oid });
    const db = mongoose.connection.db!;
    await Promise.all([
      db.collection("account").deleteMany({ userId: { $in: [id, oid] } }),
      db.collection("session").deleteMany({ userId: { $in: [id, oid] } }),
    ]);
    return Response.json({ success: true });
  } catch (e) {
    return handleServerError(e);
  }
}