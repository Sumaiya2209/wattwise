import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId, parsePagination } from "@/lib/api";
import { buildRecordFilter } from "@/lib/records-filter";
import { calculateCost } from "@/lib/cost";
import { Organization } from "@/models/Organization";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";
import { EnergyRecord } from "@/models/EnergyRecord";

type RecDoc = {
  _id: Types.ObjectId;
  meterId: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  departmentId: Types.ObjectId;
  consumption: number;
  estimatedCost: number;
  timestamp: Date;
};
type Named = { _id: Types.ObjectId; name: string };

const schema = z.object({
  meterId: z.string().refine(isValidId, "Select a meter"),
  timestamp: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date/time"),
  consumption: z.number().min(0, "Consumption can't be negative").max(100000, "Value is too large"),
});

export async function GET(req: Request) {
  const { user, error } = await getApiUser();
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const f = await buildRecordFilter(user, url);
    if ("error" in f) return apiError(f.error ?? "Unable to load records", f.status);

    const filter = "filter" in f ? f.filter : f.scope;
    const { page, limit, skip } = parsePagination(url, 15);
    const [docs, total] = await Promise.all([
      EnergyRecord.find(filter).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit).lean<RecDoc[]>(),
      EnergyRecord.countDocuments(filter),
    ]);

    const [meters, buildings, floors, depts] = await Promise.all([
      Meter.find({ _id: { $in: docs.map((d) => d.meterId) } })
        .select("meterNumber")
        .lean<{ _id: Types.ObjectId; meterNumber: string }[]>(),
      Building.find({ _id: { $in: docs.map((d) => d.buildingId) } }).select("name").lean<Named[]>(),
      Floor.find({ _id: { $in: docs.map((d) => d.floorId) } }).select("name").lean<Named[]>(),
      Department.find({ _id: { $in: docs.map((d) => d.departmentId) } }).select("name").lean<Named[]>(),
    ]);
    const mMap = new Map(meters.map((x) => [String(x._id), x.meterNumber]));
    const bMap = new Map(buildings.map((x) => [String(x._id), x.name]));
    const fMap = new Map(floors.map((x) => [String(x._id), x.name]));
    const dMap = new Map(depts.map((x) => [String(x._id), x.name]));

    return Response.json({
      data: docs.map((d) => ({
        _id: String(d._id),
        timestamp: d.timestamp,
        meterNumber: mMap.get(String(d.meterId)) ?? "—",
        buildingName: bMap.get(String(d.buildingId)) ?? "—",
        floorName: fMap.get(String(d.floorId)) ?? "—",
        departmentName: dMap.get(String(d.departmentId)) ?? "—",
        consumption: d.consumption,
        estimatedCost: d.estimatedCost,
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
  const { user, error } = await getApiUser(["org_admin", "facility_manager"]);
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const { meterId } = parsed.data;
  const consumption = Math.round(parsed.data.consumption * 100) / 100;

  // Ghonta-wari reading: minute/second muche dey (BD UTC+6 tai UTC hour-i thik)
  const ts = new Date(parsed.data.timestamp);
  ts.setUTCMinutes(0, 0, 0);
  if (ts.getTime() > Date.now() + 3600 * 1000) return apiError("Reading time can't be in the future");

  try {
    await connectDB();
    const orgId = user.organizationId as string;

    const meter = await Meter.findOne({ _id: meterId, organizationId: orgId })
      .select("buildingId floorId departmentId status")
      .lean<{
        buildingId: Types.ObjectId;
        floorId: Types.ObjectId;
        departmentId: Types.ObjectId;
        status: string;
      }>();
    if (!meter) return apiError("Meter not found", 404);
    if (meter.status === "inactive") return apiError("This meter is inactive. Activate it first.", 409);

    if (await EnergyRecord.exists({ meterId, timestamp: ts })) {
      return apiError("A reading for this meter at this hour already exists", 409);
    }

    const org = await Organization.findById(orgId).select("tariffPerKwh").lean<{ tariffPerKwh: number }>();
    const doc = await EnergyRecord.create({
      organizationId: orgId,
      meterId,
      buildingId: meter.buildingId,
      floorId: meter.floorId,
      departmentId: meter.departmentId,
      consumption,
      timestamp: ts,
      estimatedCost: calculateCost(consumption, org?.tariffPerKwh),
    });

    await Meter.updateOne(
      {
        _id: meterId,
        $or: [{ lastReadingAt: { $lt: ts } }, { lastReadingAt: { $exists: false } }, { lastReadingAt: null }],
      },
      { lastReadingAt: ts }
    );

    return Response.json(doc, { status: 201 });
  } catch (e) {
    return handleServerError(e);
  }
}