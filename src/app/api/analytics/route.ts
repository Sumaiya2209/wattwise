import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError } from "@/lib/api";
import { buildScope } from "@/lib/dashboard-scope";
import { resolveRange } from "@/lib/dashboard-range";
import { withCache } from "@/lib/cache";
import { Building } from "@/models/Building";
import { Department } from "@/models/Department";
import { EnergyRecord } from "@/models/EnergyRecord";

const TZ = "Asia/Dhaka";

type Named = { _id: Types.ObjectId; name: string };
type Bucket = { _id: Date; consumption: number; cost: number };
type Grp = { _id: Types.ObjectId; consumption: number; cost: number };
type Totals = { consumption: number; cost: number };

const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function series(match: object, unit: "day" | "month") {
  return EnergyRecord.aggregate<Bucket>([
    { $match: match },
    {
      $group: {
        _id: { $dateTrunc: { date: "$timestamp", unit, timezone: TZ } },
        consumption: { $sum: "$consumption" },
        cost: { $sum: "$estimatedCost" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

function groupBy(match: object, field: string) {
  return EnergyRecord.aggregate<Grp>([
    { $match: match },
    { $group: { _id: `$${field}`, consumption: { $sum: "$consumption" }, cost: { $sum: "$estimatedCost" } } },
    { $sort: { consumption: -1 } },
    { $limit: 12 },
  ]);
}

function totals(match: object) {
  return EnergyRecord.aggregate<Totals>([
    { $match: match },
    { $group: { _id: null, consumption: { $sum: "$consumption" }, cost: { $sum: "$estimatedCost" } } },
  ]);
}

async function handler(req: Request) {
  const { user, error } = await getApiUser();
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const s = buildScope(user, url);
    if ("error" in s) return apiError(s.error, s.status);
    const { orgId, scope } = s;

    const latest = await EnergyRecord.findOne({ organizationId: orgId })
      .sort({ timestamp: -1 })
      .select("timestamp")
      .lean<{ timestamp: Date }>();
    const range = resolveRange(url.searchParams, latest?.timestamp ?? new Date());
    const cur = { ...scope, timestamp: { $gte: range.start, $lt: range.end } };
    const prev = { ...scope, timestamp: { $gte: range.prevStart, $lt: range.prevEnd } };

    const [daily, monthly, hourRaw, bRaw, dRaw, curT, prevT] = await Promise.all([
      series(cur, "day"),
      series(cur, "month"),
      EnergyRecord.aggregate<{ _id: number; total: number }>([
        { $match: cur },
        { $group: { _id: { $hour: { date: "$timestamp", timezone: TZ } }, total: { $sum: "$consumption" } } },
      ]),
      groupBy(cur, "buildingId"),
      groupBy(cur, "departmentId"),
      totals(cur),
      totals(prev),
    ]);

    const [bDocs, dDocs] = await Promise.all([
      Building.find({ _id: { $in: bRaw.map((x) => x._id) } }).select("name").lean<Named[]>(),
      Department.find({ _id: { $in: dRaw.map((x) => x._id) } }).select("name").lean<Named[]>(),
    ]);
    const bMap = new Map(bDocs.map((x) => [String(x._id), x.name]));
    const dMap = new Map(dDocs.map((x) => [String(x._id), x.name]));
    const toGroup = (rows: Grp[], names: Map<string, string>) =>
      rows.map((r) => ({
        id: String(r._id),
        name: names.get(String(r._id)) ?? "Unknown",
        consumption: r.consumption,
        cost: r.cost,
      }));

    const c = curT[0] ?? { consumption: 0, cost: 0 };
    const p = prevT[0] ?? { consumption: 0, cost: 0 };

    // Trend: prothom ordhek vs sesh ordhek er gor
    const vals = daily.map((d) => d.consumption);
    const half = Math.floor(vals.length / 2);
    let changePct: number | null = null;
    if (vals.length >= 4) changePct = pct(avg(vals.slice(vals.length - half)), avg(vals.slice(0, half)));
    const direction = changePct === null || Math.abs(changePct) < 3 ? "flat" : changePct > 0 ? "up" : "down";
    const sorted = [...daily].sort((a, b) => b.consumption - a.consumption);

    const hourMap = new Map(hourRaw.map((h) => [h._id, h.total]));

    return Response.json({
      range: { key: range.key, start: range.start, end: range.end, days: range.days },
      kpis: {
        total: c.consumption,
        cost: c.cost,
        avgDaily: c.consumption / Math.max(range.days, 1),
        delta: pct(c.consumption, p.consumption),
        costDelta: pct(c.cost, p.cost),
      },
      hourly: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        kwh: (hourMap.get(h) ?? 0) / Math.max(range.days, 1),
      })),
      daily: daily.map((d) => ({ t: d._id, consumption: d.consumption, cost: d.cost })),
      monthly: monthly.map((d) => ({ t: d._id, consumption: d.consumption, cost: d.cost })),
      byBuilding: toGroup(bRaw, bMap),
      byDepartment: toGroup(dRaw, dMap),
      trend: {
        direction,
        changePct,
        peakDay: sorted[0] ? { t: sorted[0]._id, consumption: sorted[0].consumption } : null,
        lowDay: sorted.length ? { t: sorted[sorted.length - 1]._id, consumption: sorted[sorted.length - 1].consumption } : null,
      },
    });
  } catch (e) {
    return handleServerError(e);
  }
}

export const GET = withCache("analytics", handler);