import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, escapeRegex, handleServerError, isValidId, parsePagination } from "@/lib/api";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";

type DeptDoc = {
  _id: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  name: string;
};
type Named = { _id: Types.ObjectId; name: string };

const schema = z.object({
  floorId: z.string().refine(isValidId, "Select a floor"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
});

export async function GET(req: Request) {
  const { user, error } = await getApiUser(["org_admin", "facility_manager"]);
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url);
    const orgId = new Types.ObjectId(user.organizationId as string);

    const filter: Record<string, unknown> = { organizationId: orgId };
    for (const key of ["buildingId", "floorId"] as const) {
      const v = url.searchParams.get(key);
      if (!v) continue;
      if (!isValidId(v)) return apiError(`Invalid ${key}`);
      filter[key] = new Types.ObjectId(v);
    }
    const search = url.searchParams.get("search")?.trim();
    if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };

    const [docs, total] = await Promise.all([
      Department.find(filter).sort({ buildingId: 1, floorId: 1, name: 1 }).skip(skip).limit(limit).lean<DeptDoc[]>(),
      Department.countDocuments(filter),
    ]);

    const [buildings, floors, counts] = await Promise.all([
      Building.find({ _id: { $in: docs.map((d) => d.buildingId) } }).select("name").lean<Named[]>(),
      Floor.find({ _id: { $in: docs.map((d) => d.floorId) } }).select("name").lean<Named[]>(),
      Meter.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { departmentId: { $in: docs.map((d) => d._id) } } },
        { $group: { _id: "$departmentId", count: { $sum: 1 } } },
      ]),
    ]);
    const bMap = new Map(buildings.map((b) => [String(b._id), b.name]));
    const fMap = new Map(floors.map((f) => [String(f._id), f.name]));
    const cMap = new Map(counts.map((c) => [String(c._id), c.count]));

    return Response.json({
      data: docs.map((d) => ({
        _id: String(d._id),
        name: d.name,
        buildingName: bMap.get(String(d.buildingId)) ?? "—",
        floorName: fMap.get(String(d.floorId)) ?? "—",
        metersCount: cMap.get(String(d._id)) ?? 0,
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
  const { floorId, name } = parsed.data;

  try {
    await connectDB();
    const orgId = user.organizationId as string;
    // buildingId client theke na niye floor theke ber kora hoy
    const floor = await Floor.findOne({ _id: floorId, organizationId: orgId })
      .select("buildingId")
      .lean<{ buildingId: Types.ObjectId }>();
    if (!floor) return apiError("Floor not found", 404);

    if (await Department.exists({ floorId, name })) {
      return apiError("A department with this name already exists on this floor", 409);
    }
    const doc = await Department.create({
      organizationId: orgId,
      buildingId: floor.buildingId,
      floorId,
      name,
    });
    return Response.json(doc, { status: 201 });
  } catch (e) {
    return handleServerError(e);
  }
}