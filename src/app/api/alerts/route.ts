import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { handleServerError, isValidId, apiError, parsePagination } from "@/lib/api";
import { Alert } from "@/models/Alert";
import { Meter } from "@/models/Meter";
import { Building } from "@/models/Building";

type AlertDoc = {
  _id: Types.ObjectId;
  buildingId?: Types.ObjectId;
  meterId?: Types.ObjectId;
  type: string;
  status: string;
  message: string;
  value: number;
  limit?: number;
  triggeredAt: Date;
};

export async function GET(req: Request) {
  const { user, error } = await getApiUser(["org_admin", "facility_manager"]);
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url);
    const orgId = new Types.ObjectId(user.organizationId as string);

    const filter: Record<string, unknown> = { organizationId: orgId };
    const status = url.searchParams.get("status");
    if (status && ["new", "acknowledged", "resolved"].includes(status)) filter.status = status;
    const type = url.searchParams.get("type");
    if (type && ["high_usage", "unusual"].includes(type)) filter.type = type;
    const building = url.searchParams.get("building");
    if (building) {
      if (!isValidId(building)) return apiError("Invalid building");
      filter.buildingId = new Types.ObjectId(building);
    }

    const [docs, total, newCount] = await Promise.all([
      Alert.find(filter).sort({ triggeredAt: -1 }).skip(skip).limit(limit).lean<AlertDoc[]>(),
      Alert.countDocuments(filter),
      Alert.countDocuments({ organizationId: orgId, status: "new" }),
    ]);

    const [meters, buildings] = await Promise.all([
      Meter.find({ _id: { $in: docs.flatMap((d) => (d.meterId ? [d.meterId] : [])) } })
        .select("meterNumber")
        .lean<{ _id: Types.ObjectId; meterNumber: string }[]>(),
      Building.find({ _id: { $in: docs.flatMap((d) => (d.buildingId ? [d.buildingId] : [])) } })
        .select("name")
        .lean<{ _id: Types.ObjectId; name: string }[]>(),
    ]);
    const mMap = new Map(meters.map((m) => [String(m._id), m.meterNumber]));
    const bMap = new Map(buildings.map((b) => [String(b._id), b.name]));

    return Response.json({
      data: docs.map((d) => ({
        _id: String(d._id),
        type: d.type,
        status: d.status,
        message: d.message,
        value: d.value,
        limit: d.limit,
        triggeredAt: d.triggeredAt,
        meterNumber: d.meterId ? mMap.get(String(d.meterId)) : undefined,
        buildingName: d.buildingId ? bMap.get(String(d.buildingId)) : undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      newCount,
    });
  } catch (e) {
    return handleServerError(e);
  }
}