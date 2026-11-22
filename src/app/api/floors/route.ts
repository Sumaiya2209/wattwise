import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, escapeRegex, handleServerError, isValidId, parsePagination } from "@/lib/api";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";

type FloorDoc = { _id: Types.ObjectId; buildingId: Types.ObjectId; name: string; level: number };
type Named = { _id: Types.ObjectId; name: string };

const schema = z.object({
  buildingId: z.string().refine(isValidId, "Select a building"),
  name: z.string().trim().min(1, "Floor name is required").max(60),
  level: z.number().int("Level must be a whole number").min(0, "Level can't be negative").max(200),
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
    const buildingId = url.searchParams.get("buildingId");
    if (buildingId) {
      if (!isValidId(buildingId)) return apiError("Invalid building");
      filter.buildingId = new Types.ObjectId(buildingId);
    }
    const search = url.searchParams.get("search")?.trim();
    if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };

    const [docs, total] = await Promise.all([
      Floor.find(filter).sort({ buildingId: 1, level: 1 }).skip(skip).limit(limit).lean<FloorDoc[]>(),
      Floor.countDocuments(filter),
    ]);

    const [buildings, counts] = await Promise.all([
      Building.find({ _id: { $in: docs.map((d) => d.buildingId) } }).select("name").lean<Named[]>(),
      Department.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { floorId: { $in: docs.map((d) => d._id) } } },
        { $group: { _id: "$floorId", count: { $sum: 1 } } },
      ]),
    ]);
    const bMap = new Map(buildings.map((b) => [String(b._id), b.name]));
    const cMap = new Map(counts.map((c) => [String(c._id), c.count]));

    return Response.json({
      data: docs.map((d) => ({
        _id: String(d._id),
        buildingId: String(d.buildingId),
        buildingName: bMap.get(String(d.buildingId)) ?? "—",
        name: d.name,
        level: d.level,
        departmentsCount: cMap.get(String(d._id)) ?? 0,
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
  const { buildingId, name, level } = parsed.data;

  try {
    await connectDB();
    const orgId = user.organizationId as string;
    if (!(await Building.exists({ _id: buildingId, organizationId: orgId }))) {
      return apiError("Building not found", 404);
    }
    const doc = await Floor.create({ organizationId: orgId, buildingId, name, level });
    await Building.updateOne({ _id: buildingId }, { totalFloors: await Floor.countDocuments({ buildingId }) });
    return Response.json(doc, { status: 201 });
  } catch (e) {
    return handleServerError(e);
  }
}