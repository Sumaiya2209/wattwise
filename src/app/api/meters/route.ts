import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, escapeRegex, handleServerError, isValidId, parsePagination } from "@/lib/api";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";

type MeterDoc = {
  _id: Types.ObjectId;
  meterNumber: string;
  type: string;
  status: string;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  departmentId: Types.ObjectId;
  lastReadingAt?: Date;
};
type Named = { _id: Types.ObjectId; name: string };

const ROLES = ["org_admin", "facility_manager"] as const;

const schema = z.object({
  departmentId: z.string().refine(isValidId, "Select a department"),
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

export async function GET(req: Request) {
  const { user, error } = await getApiUser([...ROLES]);
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url);
    const orgId = new Types.ObjectId(user.organizationId as string);

    const filter: Record<string, unknown> = { organizationId: orgId };
    const buildingId = url.searchParams.get("buildingId");
    if (buildingId) {
      if (!isValidId(buildingId)) return apiError("Invalid building");
      filter.buildingId = new Types.ObjectId(buildingId);
    }
    const status = url.searchParams.get("status");
    if (status && ["active", "inactive", "faulty"].includes(status)) filter.status = status;
    const search = url.searchParams.get("search")?.trim();
    if (search) filter.meterNumber = { $regex: escapeRegex(search), $options: "i" };

    const [docs, total] = await Promise.all([
      Meter.find(filter).sort({ meterNumber: 1 }).skip(skip).limit(limit).lean<MeterDoc[]>(),
      Meter.countDocuments(filter),
    ]);

    const [buildings, floors, depts] = await Promise.all([
      Building.find({ _id: { $in: docs.map((d) => d.buildingId) } }).select("name").lean<Named[]>(),
      Floor.find({ _id: { $in: docs.map((d) => d.floorId) } }).select("name").lean<Named[]>(),
      Department.find({ _id: { $in: docs.map((d) => d.departmentId) } }).select("name").lean<Named[]>(),
    ]);
    const bMap = new Map(buildings.map((x) => [String(x._id), x.name]));
    const fMap = new Map(floors.map((x) => [String(x._id), x.name]));
    const dMap = new Map(depts.map((x) => [String(x._id), x.name]));

    return Response.json({
      data: docs.map((d) => ({
        _id: String(d._id),
        meterNumber: d.meterNumber,
        type: d.type,
        status: d.status,
        buildingName: bMap.get(String(d.buildingId)) ?? "—",
        floorName: fMap.get(String(d.floorId)) ?? "—",
        departmentName: dMap.get(String(d.departmentId)) ?? "—",
        lastReadingAt: d.lastReadingAt,
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
  const { user, error } = await getApiUser([...ROLES]);
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const { departmentId, meterNumber, type, status } = parsed.data;

  try {
    await connectDB();
    const orgId = user.organizationId as string;
    // building/floor department theke ber kora hoy, valid reference guarantee
    const dept = await Department.findOne({ _id: departmentId, organizationId: orgId })
      .select("buildingId floorId")
      .lean<{ buildingId: Types.ObjectId; floorId: Types.ObjectId }>();
    if (!dept) return apiError("Department not found", 404);

    const doc = await Meter.create({
      organizationId: orgId,
      buildingId: dept.buildingId,
      floorId: dept.floorId,
      departmentId,
      meterNumber,
      type,
      status,
    });
    return Response.json(doc, { status: 201 });
  } catch (e) {
    return handleServerError(e);
  }
}