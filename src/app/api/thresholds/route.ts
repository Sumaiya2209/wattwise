import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId, parsePagination } from "@/lib/api";
import { Threshold } from "@/models/Threshold";
import { Building } from "@/models/Building";
import { Meter } from "@/models/Meter";

const ROLES = ["org_admin", "facility_manager"] as const;

type ThDoc = {
  _id: Types.ObjectId;
  scope: "building" | "meter";
  buildingId?: Types.ObjectId;
  meterId?: Types.ObjectId;
  period: "hourly" | "daily";
  limitKwh: number;
  isActive: boolean;
  createdAt: Date;
};
type Named = { _id: Types.ObjectId; name: string };

const schema = z.object({
  scope: z.enum(["building", "meter"]),
  buildingId: z.string().optional(),
  meterId: z.string().optional(),
  period: z.enum(["hourly", "daily"]),
  limitKwh: z.number().positive("Limit must be greater than 0").max(10_000_000, "Limit is too large"),
});

export async function GET(req: Request) {
  const { user, error } = await getApiUser([...ROLES]);
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url);
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(user.organizationId as string),
    };
    const scope = url.searchParams.get("scope");
    if (scope === "building" || scope === "meter") filter.scope = scope;

    const [docs, total] = await Promise.all([
      Threshold.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<ThDoc[]>(),
      Threshold.countDocuments(filter),
    ]);

    const meters = await Meter.find({ _id: { $in: docs.flatMap((d) => (d.meterId ? [d.meterId] : [])) } })
      .select("meterNumber buildingId")
      .lean<{ _id: Types.ObjectId; meterNumber: string; buildingId: Types.ObjectId }[]>();
    const buildingIds = [...docs.flatMap((d) => (d.buildingId ? [d.buildingId] : [])), ...meters.map((m) => m.buildingId)];
    const buildings = await Building.find({ _id: { $in: buildingIds } }).select("name").lean<Named[]>();

    const bMap = new Map(buildings.map((b) => [String(b._id), b.name]));
    const mMap = new Map(meters.map((m) => [String(m._id), m]));

    return Response.json({
      data: docs.map((d) => {
        const meter = d.meterId ? mMap.get(String(d.meterId)) : undefined;
        return {
          _id: String(d._id),
          scope: d.scope,
          targetName:
            d.scope === "meter"
              ? meter?.meterNumber ?? "Deleted meter"
              : bMap.get(String(d.buildingId)) ?? "Deleted building",
          buildingName: meter ? bMap.get(String(meter.buildingId)) : undefined,
          period: d.period,
          limitKwh: d.limitKwh,
          isActive: d.isActive,
          createdAt: d.createdAt,
        };
      }),
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
  const { scope, buildingId, meterId, period } = parsed.data;
  const limitKwh = Math.round(parsed.data.limitKwh * 100) / 100;
  const orgId = user.organizationId as string;

  try {
    await connectDB();

    if (scope === "building") {
      if (!buildingId || !isValidId(buildingId)) return apiError("Select a building");
      if (!(await Building.exists({ _id: buildingId, organizationId: orgId }))) {
        return apiError("Building not found", 404);
      }
      if (await Threshold.exists({ organizationId: orgId, scope, buildingId, period })) {
        return apiError(`A ${period} limit already exists for this building. Edit it instead.`, 409);
      }
      const doc = await Threshold.create({
        organizationId: orgId,
        scope,
        buildingId,
        period,
        limitKwh,
        isActive: true,
        createdBy: user.id,
      });
      return Response.json(doc, { status: 201 });
    }

    if (!meterId || !isValidId(meterId)) return apiError("Select a meter");
    if (!(await Meter.exists({ _id: meterId, organizationId: orgId }))) {
      return apiError("Meter not found", 404);
    }
    if (await Threshold.exists({ organizationId: orgId, scope, meterId, period })) {
      return apiError(`A ${period} limit already exists for this meter. Edit it instead.`, 409);
    }
    const doc = await Threshold.create({
      organizationId: orgId,
      scope,
      meterId,
      period,
      limitKwh,
      isActive: true,
      createdBy: user.id,
    });
    return Response.json(doc, { status: 201 });
  } catch (e) {
    return handleServerError(e);
  }
}