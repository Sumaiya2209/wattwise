import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId } from "@/lib/api";
import { CARBON_KG_PER_KWH } from "@/lib/cost";
import { resolveRange } from "@/lib/dashboard-range";
import { Organization } from "@/models/Organization";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";
import { EnergyRecord } from "@/models/EnergyRecord";
import { withCache } from "@/lib/cache";

const TZ = "Asia/Dhaka";
const UNITS = { hourly: "hour", daily: "day", monthly: "month" } as const;

type Named = { _id: Types.ObjectId; name: string };
type Totals = { consumption: number; cost: number };
type HourPoint = { _id: Date; total: number };
type MeterDoc = {
  _id: Types.ObjectId;
  meterNumber: string;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  departmentId: Types.ObjectId;
};

const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

async function handler(req: Request) {
  const { user, error } = await getApiUser();
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const orgId = new Types.ObjectId(user.organizationId as string);

    // Scope: org + (optional building) + (department manager hole nijer department)
    const scope: Record<string, unknown> = { organizationId: orgId };
    const buildingParam = url.searchParams.get("building");
    if (buildingParam) {
      if (!isValidId(buildingParam)) return apiError("Invalid building");
      scope.buildingId = new Types.ObjectId(buildingParam);
    }
    if (user.role === "department_manager") {
      if (!user.departmentId) return apiError("No department assigned", 403);
      scope.departmentId = new Types.ObjectId(user.departmentId as string);
    }

    const latest = await EnergyRecord.findOne({ organizationId: orgId })
      .sort({ timestamp: -1 })
      .select("timestamp")
      .lean<{ timestamp: Date }>();

    const range = resolveRange(url.searchParams, latest?.timestamp ?? new Date());
    const granParam = url.searchParams.get("granularity");
    const granularity: keyof typeof UNITS =
      granParam === "hourly" || granParam === "monthly" ? granParam : "daily";
    const by = url.searchParams.get("by") === "departments" ? "departments" : "buildings";

    const curMatch = { ...scope, timestamp: { $gte: range.start, $lt: range.end } };
    const prevMatch = { ...scope, timestamp: { $gte: range.prevStart, $lt: range.prevEnd } };

    const totalsPipeline = (match: object) => [
      { $match: match },
      {
        $group: {
          _id: null,
          consumption: { $sum: "$consumption" },
          cost: { $sum: "$estimatedCost" },
        },
      },
    ];

    const [org, curArr, prevArr, hourly, seriesRaw, distRaw, metersRaw] = await Promise.all([
      Organization.findById(orgId).select("tariffPerKwh").lean<{ tariffPerKwh: number }>(),
      EnergyRecord.aggregate<Totals>(totalsPipeline(curMatch)),
      EnergyRecord.aggregate<Totals>(totalsPipeline(prevMatch)),
      // Peak / lowest: prottek ghonta r total load (kW)
      EnergyRecord.aggregate<{ peak: HourPoint[]; low: HourPoint[] }>([
        { $match: curMatch },
        {
          $group: {
            _id: { $dateTrunc: { date: "$timestamp", unit: "hour", timezone: TZ } },
            total: { $sum: "$consumption" },
          },
        },
        {
          $facet: {
            peak: [{ $sort: { total: -1 } }, { $limit: 1 }],
            low: [{ $sort: { total: 1 } }, { $limit: 1 }],
          },
        },
      ]),
      EnergyRecord.aggregate<{ _id: Date; consumption: number; cost: number }>([
        { $match: curMatch },
        {
          $group: {
            _id: { $dateTrunc: { date: "$timestamp", unit: UNITS[granularity], timezone: TZ } },
            consumption: { $sum: "$consumption" },
            cost: { $sum: "$estimatedCost" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      EnergyRecord.aggregate<{ _id: Types.ObjectId; consumption: number }>([
        { $match: curMatch },
        {
          $group: {
            _id: by === "departments" ? "$departmentId" : "$buildingId",
            consumption: { $sum: "$consumption" },
          },
        },
        { $sort: { consumption: -1 } },
        { $limit: 8 },
      ]),
      EnergyRecord.aggregate<{ _id: Types.ObjectId; consumption: number; cost: number }>([
        { $match: curMatch },
        {
          $group: {
            _id: "$meterId",
            consumption: { $sum: "$consumption" },
            cost: { $sum: "$estimatedCost" },
          },
        },
        { $sort: { consumption: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const current = curArr[0] ?? { consumption: 0, cost: 0 };
    const previous = prevArr[0] ?? { consumption: 0, cost: 0 };

    // Names lookup
    const distDocs = await (by === "departments" ? Department : Building)
      .find({ _id: { $in: distRaw.map((d) => d._id) } })
      .select("name")
      .lean<Named[]>();
    const distNames = new Map(distDocs.map((d) => [String(d._id), d.name]));

    const meterDocs = await Meter.find({ _id: { $in: metersRaw.map((m) => m._id) } })
      .select("meterNumber buildingId floorId departmentId")
      .lean<MeterDoc[]>();
    const [bDocs, fDocs, dDocs] = await Promise.all([
      Building.find({ _id: { $in: meterDocs.map((m) => m.buildingId) } }).select("name").lean<Named[]>(),
      Floor.find({ _id: { $in: meterDocs.map((m) => m.floorId) } })
        .select("level")
        .lean<{ _id: Types.ObjectId; level: number }[]>(),
      Department.find({ _id: { $in: meterDocs.map((m) => m.departmentId) } }).select("name").lean<Named[]>(),
    ]);
    const bMap = new Map(bDocs.map((d) => [String(d._id), d.name]));
    const fMap = new Map(fDocs.map((d) => [String(d._id), `Floor ${String(d.level).padStart(2, "0")}`]));
    const dMap = new Map(dDocs.map((d) => [String(d._id), d.name]));
    const mMap = new Map(meterDocs.map((m) => [String(m._id), m]));

    const peak = hourly[0]?.peak[0];
    const low = hourly[0]?.low[0];

    return Response.json({
      range: {
        key: range.key,
        start: range.start,
        end: range.end,
        days: range.days,
      },
      tariff: org?.tariffPerKwh ?? 8,
      carbonFactor: CARBON_KG_PER_KWH,
      kpis: {
        totalConsumption: current.consumption,
        totalCost: current.cost,
        avgDaily: current.consumption / range.days,
        prevAvgDaily: previous.consumption / range.days,
        consumptionDelta: pct(current.consumption, previous.consumption),
        costDelta: pct(current.cost, previous.cost),
        peak: peak ? { kw: peak.total, at: peak._id } : null,
        low: low ? { kw: low.total, at: low._id } : null,
        carbonKg: current.consumption * CARBON_KG_PER_KWH,
      },
      series: seriesRaw.map((s) => ({ t: s._id, consumption: s.consumption, cost: s.cost })),
      distribution: distRaw.map((d) => ({
        id: String(d._id),
        name: distNames.get(String(d._id)) ?? "Unknown",
        consumption: d.consumption,
        share: current.consumption > 0 ? (d.consumption / current.consumption) * 100 : 0,
      })),
      meters: metersRaw.map((m) => {
        const doc = mMap.get(String(m._id));
        return {
          id: String(m._id),
          meterNumber: doc?.meterNumber ?? "—",
          building: doc ? bMap.get(String(doc.buildingId)) ?? "—" : "—",
          floor: doc ? fMap.get(String(doc.floorId)) ?? "—" : "—",
          department: doc ? dMap.get(String(doc.departmentId)) ?? "—" : "—",
          avgKw: range.hours > 0 ? m.consumption / range.hours : 0,
          consumption: m.consumption,
          cost: m.cost,
        };
      }),
    });
  } catch (e) {
    return handleServerError(e);
  }
}

export const GET = withCache("dashboard", handler);