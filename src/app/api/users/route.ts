import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getApiUser } from "@/lib/session";
import { usersCol } from "@/lib/users-db";
import { apiError, escapeRegex, handleServerError, isValidId, parsePagination } from "@/lib/api";
import { Department } from "@/models/Department";

type UserDoc = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  departmentId?: string;
  createdAt: Date;
};

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  role: z.enum(["org_admin", "facility_manager", "department_manager", "viewer"]),
  departmentId: z.string().optional(),
});

export async function GET(req: Request) {
  const { user, error } = await getApiUser(["org_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url);
    const filter: Record<string, unknown> = { organizationId: String(user.organizationId) };
    const search = url.searchParams.get("search")?.trim();
    if (search) {
      const re = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ name: re }, { email: re }];
    }

    const col = usersCol();
    const [docs, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray() as unknown as Promise<UserDoc[]>,
      col.countDocuments(filter),
    ]);

    const depts = await Department.find({
      _id: { $in: docs.flatMap((d) => (d.departmentId && isValidId(d.departmentId) ? [d.departmentId] : [])) },
    })
      .select("name")
      .lean<{ _id: Types.ObjectId; name: string }[]>();
    const dMap = new Map(depts.map((d) => [String(d._id), d.name]));

    return Response.json({
      data: docs.map((d) => ({
        _id: String(d._id),
        name: d.name,
        email: d.email,
        role: d.role,
        departmentName: d.departmentId ? dMap.get(d.departmentId) : undefined,
        createdAt: d.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    return handleServerError(e);
  }
}

export async function POST(req: Request) {
  const { user, error } = await getApiUser(["org_admin"]);
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const { name, email, password, role, departmentId } = parsed.data;
  const orgId = String(user.organizationId);

  try {
    await connectDB();

    let deptId: string | undefined;
    if (role === "department_manager") {
      if (!departmentId || !isValidId(departmentId)) return apiError("Select a department for the department manager");
      if (!(await Department.exists({ _id: departmentId, organizationId: orgId }))) {
        return apiError("Department not found", 404);
      }
      deptId = departmentId;
    }

    const col = usersCol();
    if (await col.findOne({ email })) return apiError("A user with this email already exists", 409);

    try {
      await auth.api.signUpEmail({ body: { email, password, name } });
    } catch (e) {
      return apiError(e instanceof Error ? e.message : "Could not create user", 400);
    }

    await col.updateOne(
      { email },
      { $set: { role, organizationId: orgId, ...(deptId ? { departmentId: deptId } : {}) } }
    );
    if (deptId) await Department.updateOne({ _id: deptId }, { managerId: email });

    return Response.json({ success: true }, { status: 201 });
  } catch (e) {
    return handleServerError(e);
  }
}