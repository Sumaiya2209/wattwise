import { Types } from "mongoose";
import { EnergyRecord } from "@/models/EnergyRecord";
import { Threshold } from "@/models/Threshold";
import { Alert } from "@/models/Alert";
import { Meter } from "@/models/Meter";
import { Building } from "@/models/Building";

const TZ = "Asia/Dhaka";
const DAY = 24 * 3600 * 1000;
const SCAN_DAYS = 14; // sesh 14 diner data scan hoy
const BASELINE_DAYS = 30; // baseline: sesh 30 din
const Z_SCORE = 3;
const MIN_RATIO = 1.8;
const MAX_UNUSUAL = 25;

type ThresholdDoc = {
  _id: Types.ObjectId;
  scope: "building" | "meter";
  buildingId?: Types.ObjectId;
  meterId?: Types.ObjectId;
  period: "hourly" | "daily";
  limitKwh: number;
};
type RecentDoc = {
  meterId: Types.ObjectId;
  buildingId: Types.ObjectId;
  timestamp: Date;
  consumption: number;
};
type Named = { _id: Types.ObjectId; name: string };

const num = (n: number) => Math.round(n).toLocaleString("en-US");

function upsertOp(dedupKey: string, doc: Record<string, unknown>) {
  return {
    updateOne: {
      filter: { dedupKey },
      update: { $setOnInsert: { ...doc, dedupKey, status: "new" } },
      upsert: true as const,
    },
  };
}

async function saveOps(ops: ReturnType<typeof upsertOp>[]) {
  if (!ops.length) return 0;
  const res = await Alert.bulkWrite(ops, { ordered: false });
  return res.upsertedCount;
}

// Threshold nai thakle: prottek building er jonno 90th percentile daily usage ke limit dhora hoy
async function createDefaultThresholds(
  orgId: Types.ObjectId,
  from: Date,
  to: Date,
  createdBy: string
): Promise<ThresholdDoc[]> {
  const daily = await EnergyRecord.aggregate<{
    _id: { b: Types.ObjectId; d: Date };
    total: number;
  }>([
    { $match: { organizationId: orgId, timestamp: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: {
          b: "$buildingId",
          d: { $dateTrunc: { date: "$timestamp", unit: "day", timezone: TZ } },
        },
        total: { $sum: "$consumption" },
      },
    },
  ]);

  const byBuilding = new Map<string, number[]>();
  for (const r of daily) {
    const k = String(r._id.b);
    const arr = byBuilding.get(k) ?? [];
    arr.push(r.total);
    byBuilding.set(k, arr);
  }

  const docs = [...byBuilding.entries()].map(([k, arr]) => {
    arr.sort((a, b) => a - b);
    const p90 = arr[Math.floor((arr.length - 1) * 0.9)];
    return {
      organizationId: orgId,
      scope: "building",
      buildingId: new Types.ObjectId(k),
      period: "daily",
      limitKwh: Math.round(p90),
      isActive: true,
      createdBy,
    };
  });
  if (!docs.length) return [];

  const created = await Threshold.insertMany(docs);
  return created.map((d) => d.toObject()) as unknown as ThresholdDoc[];
}

export async function runAlertEngine(orgId: Types.ObjectId, userId: string) {
  const latest = await EnergyRecord.findOne({ organizationId: orgId })
    .sort({ timestamp: -1 })
    .select("timestamp")
    .lean<{ timestamp: Date }>();
  if (!latest) return { created: 0, high: 0, unusual: 0, thresholds: 0 };

  const end = new Date(latest.timestamp.getTime() + 3600 * 1000);
  const scanStart = new Date(end.getTime() - SCAN_DAYS * DAY);
  const baseStart = new Date(end.getTime() - BASELINE_DAYS * DAY);

  // ---------- 1. High usage (threshold based) ----------
  let thresholds = await Threshold.find({ organizationId: orgId, isActive: true }).lean<ThresholdDoc[]>();
  if (thresholds.length === 0 && !(await Threshold.exists({ organizationId: orgId }))) {
    thresholds = await createDefaultThresholds(orgId, baseStart, end, userId);
  }

  const highOps: ReturnType<typeof upsertOp>[] = [];
  for (const t of thresholds) {
    const targetId = t.scope === "meter" ? t.meterId : t.buildingId;
    if (!targetId) continue;

    const match = {
      organizationId: orgId,
      timestamp: { $gte: scanStart, $lt: end },
      ...(t.scope === "meter" ? { meterId: targetId } : { buildingId: targetId }),
    };
    const buckets = await EnergyRecord.aggregate<{ _id: Date; total: number }>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$timestamp",
              unit: t.period === "hourly" ? "hour" : "day",
              timezone: TZ,
            },
          },
          total: { $sum: "$consumption" },
        },
      },
      { $match: { total: { $gt: t.limitKwh } } },
    ]);
    if (!buckets.length) continue;

    const meterDoc =
      t.scope === "meter"
        ? await Meter.findById(targetId).select("meterNumber buildingId").lean<{
            meterNumber: string;
            buildingId: Types.ObjectId;
          }>()
        : null;
    const buildingId = t.scope === "meter" ? meterDoc?.buildingId : t.buildingId;
    const buildingName = buildingId
      ? (await Building.findById(buildingId).select("name").lean<{ name: string }>())?.name
      : undefined;
    const label = t.scope === "meter" ? meterDoc?.meterNumber ?? "Meter" : buildingName ?? "Building";

    for (const b of buckets) {
      const over = ((b.total - t.limitKwh) / t.limitKwh) * 100;
      highOps.push(
        upsertOp(`high:${t.scope}:${targetId}:${t.period}:${b._id.toISOString()}`, {
          organizationId: orgId,
          buildingId,
          meterId: t.scope === "meter" ? targetId : undefined,
          thresholdId: t._id,
          type: "high_usage",
          message: `${label} used ${num(b.total)} kWh vs ${num(t.limitKwh)} kWh ${t.period} limit (+${over.toFixed(1)}%)`,
          value: Math.round(b.total * 100) / 100,
          limit: t.limitKwh,
          triggeredAt: b._id,
        })
      );
    }
  }

  // ---------- 2. Unusual consumption (z-score, meter + hour-of-day baseline) ----------
  const baseline = await EnergyRecord.aggregate<{
    _id: { m: Types.ObjectId; h: number };
    mean: number;
    std: number;
  }>([
    { $match: { organizationId: orgId, timestamp: { $gte: baseStart, $lt: end } } },
    {
      $group: {
        _id: { m: "$meterId", h: { $hour: { date: "$timestamp", timezone: TZ } } },
        mean: { $avg: "$consumption" },
        std: { $stdDevPop: "$consumption" },
      },
    },
  ]);
  const base = new Map(baseline.map((b) => [`${b._id.m}:${b._id.h}`, b]));

  const recent = await EnergyRecord.find({
    organizationId: orgId,
    timestamp: { $gte: scanStart, $lt: end },
  })
    .select("meterId buildingId timestamp consumption")
    .lean<RecentDoc[]>();

  const flagged: { r: RecentDoc; mean: number; z: number }[] = [];
  for (const r of recent) {
    const hour = new Date(r.timestamp.getTime() + 6 * 3600 * 1000).getUTCHours();
    const b = base.get(`${r.meterId}:${hour}`);
    if (!b || b.std <= 0) continue;
    const z = (r.consumption - b.mean) / b.std;
    if (z >= Z_SCORE && r.consumption >= b.mean * MIN_RATIO) flagged.push({ r, mean: b.mean, z });
  }
  flagged.sort((a, b) => b.z - a.z);
  const top = flagged.slice(0, MAX_UNUSUAL);

  const [meters, buildings] = await Promise.all([
    Meter.find({ _id: { $in: top.map((f) => f.r.meterId) } })
      .select("meterNumber")
      .lean<{ _id: Types.ObjectId; meterNumber: string }[]>(),
    Building.find({ _id: { $in: top.map((f) => f.r.buildingId) } })
      .select("name")
      .lean<Named[]>(),
  ]);
  const meterName = new Map(meters.map((m) => [String(m._id), m.meterNumber]));
  const buildingName = new Map(buildings.map((b) => [String(b._id), b.name]));

  const unusualOps = top.map(({ r, mean }) => {
    const pct = (r.consumption / mean - 1) * 100;
    return upsertOp(`unusual:${r.meterId}:${r.timestamp.toISOString()}`, {
      organizationId: orgId,
      buildingId: r.buildingId,
      meterId: r.meterId,
      type: "unusual",
      message: `Unusual consumption on ${meterName.get(String(r.meterId)) ?? "meter"} (${buildingName.get(String(r.buildingId)) ?? "building"}): ${r.consumption.toFixed(1)} kWh vs ~${mean.toFixed(1)} kWh expected for this hour (+${pct.toFixed(0)}%)`,
      value: r.consumption,
      limit: Math.round(mean * 100) / 100,
      triggeredAt: r.timestamp,
    });
  });

  const [high, unusual] = await Promise.all([saveOps(highOps), saveOps(unusualOps)]);
  return { created: high + unusual, high, unusual, thresholds: thresholds.length };
}