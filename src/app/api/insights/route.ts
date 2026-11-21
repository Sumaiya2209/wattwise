import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError } from "@/lib/api";
import { buildScope } from "@/lib/dashboard-scope";
import { resolveRange } from "@/lib/dashboard-range";
import type { Insight } from "@/types/alerts";
import { Organization } from "@/models/Organization";
import { Building } from "@/models/Building";
import { Meter } from "@/models/Meter";
import { Alert } from "@/models/Alert";
import { EnergyRecord } from "@/models/EnergyRecord";

const TZ = "Asia/Dhaka";
const hh = (n: number) => String(n).padStart(2, "0");
const num = (n: number) => Math.round(n).toLocaleString("en-US");

// Savings assumption: peak-hour load 10% kombe, off-hours idle load 20% kombe
const PEAK_REDUCTION = 0.1;
const OFFHOURS_REDUCTION = 0.2;

type Totals = { total: number };
type Hod = { _id: number; total: number };

export async function GET(req: Request) {
  const { user, error } = await getApiUser();
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const s = buildScope(user, url);
    if ("error" in s && s.error) return apiError(s.error, s.status);
    const { orgId, scope } = s;

    const latest = await EnergyRecord.findOne({ organizationId: orgId })
      .sort({ timestamp: -1 })
      .select("timestamp")
      .lean<{ timestamp: Date }>();
    const range = resolveRange(url.searchParams, latest?.timestamp ?? new Date());
    const curMatch = { ...scope, timestamp: { $gte: range.start, $lt: range.end } };
    const prevMatch = { ...scope, timestamp: { $gte: range.prevStart, $lt: range.prevEnd } };
    const monthFactor = 30 / Math.max(range.days, 1);

    const totalPipe = (m: object) => [
      { $match: m },
      { $group: { _id: null, total: { $sum: "$consumption" } } },
    ];
    const hodPipe = (m: object) => [
      { $match: m },
      { $group: { _id: { $hour: { date: "$timestamp", timezone: TZ } }, total: { $sum: "$consumption" } } },
    ];

    const [org, curArr, prevArr, hodRaw, topBuilding, recordsAnalyzed] = await Promise.all([
      Organization.findById(orgId).select("tariffPerKwh").lean<{ tariffPerKwh: number }>(),
      EnergyRecord.aggregate<Totals>(totalPipe(curMatch)),
      EnergyRecord.aggregate<Totals>(totalPipe(prevMatch)),
      EnergyRecord.aggregate<Hod>(hodPipe(curMatch)),
      EnergyRecord.aggregate<{ _id: Types.ObjectId; total: number }>([
        { $match: curMatch },
        { $group: { _id: "$buildingId", total: { $sum: "$consumption" } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]),
      EnergyRecord.countDocuments(curMatch),
    ]);

    const tariff = org?.tariffPerKwh ?? 8;
    const cur = curArr[0]?.total ?? 0;
    const prev = prevArr[0]?.total ?? 0;

    const insights: Insight[] = [];

    // ---------- 1. Anomaly (or usage trend) ----------
    let anomaly: Insight | null = null;
    if (user.role !== "department_manager") {
      const alertFilter: Record<string, unknown> = {
        organizationId: orgId,
        type: "unusual",
        status: { $ne: "resolved" },
      };
      if (scope.buildingId) alertFilter.buildingId = scope.buildingId;
      const a = await Alert.findOne(alertFilter)
        .sort({ triggeredAt: -1 })
        .lean<{
          meterId?: Types.ObjectId;
          buildingId?: Types.ObjectId;
          value: number;
          limit?: number;
          triggeredAt: Date;
        }>();
      if (a && a.limit) {
        const [m, b] = await Promise.all([
          a.meterId ? Meter.findById(a.meterId).select("meterNumber").lean<{ meterNumber: string }>() : null,
          a.buildingId ? Building.findById(a.buildingId).select("name").lean<{ name: string }>() : null,
        ]);
        const pct = (a.value / a.limit - 1) * 100;
        anomaly = {
          id: "anomaly",
          tag: "ANOMALY DETECTED",
          tone: "warn",
          scope: b?.name ?? "—",
          when: a.triggeredAt.toISOString(),
          title: `${m?.meterNumber ?? "Meter"} Spike (+${pct.toFixed(0)}%)`,
          body: `Recorded ${a.value.toFixed(1)} kWh vs ~${a.limit.toFixed(1)} kWh normally expected for this hour.`,
          saveBdt: Math.round((a.value - a.limit) * tariff),
          saveLabel: "Excess",
          action: "Inspect Meter",
        };
      }
    }
    if (anomaly) {
      insights.push(anomaly);
    } else {
      const delta = prev > 0 ? ((cur - prev) / prev) * 100 : null;
      const up = (delta ?? 0) > 0;
      insights.push({
        id: "trend",
        tag: "USAGE TREND",
        tone: up ? "warn" : "good",
        scope: "Selected period",
        title: delta === null ? "No previous period to compare" : `Consumption ${up ? "up" : "down"} ${Math.abs(delta).toFixed(1)}%`,
        body: `${num(cur)} kWh this period vs ${num(prev)} kWh in the previous period of the same length.`,
        saveBdt: delta === null ? null : Math.round(Math.abs(cur - prev) * tariff * monthFactor),
        saveLabel: up ? "Excess" : "Save",
        action: up ? "Review Usage Trend" : "Keep Current Practices",
      });
    }

    // ---------- 2. Peak load driver ----------
    const tb = topBuilding[0];
    if (tb) {
      const [bDoc, bHodRaw] = await Promise.all([
        Building.findById(tb._id).select("name").lean<{ name: string }>(),
        EnergyRecord.aggregate<Hod>(hodPipe({ ...curMatch, buildingId: tb._id })),
      ]);
      const bHod: number[] = new Array(24).fill(0);
      bHodRaw.forEach((h) => (bHod[h._id] = h.total));
      const peakHour = bHod.indexOf(Math.max(...bHod));
      const avgHour = bHod.reduce((a, b) => a + b, 0) / 24;
      const above = avgHour > 0 ? (bHod[peakHour] / avgHour - 1) * 100 : 0;
      const share = cur > 0 ? (tb.total / cur) * 100 : 0;
      insights.push({
        id: "peak",
        tag: "PEAK LOAD DRIVER",
        tone: "info",
        scope: bDoc?.name ?? "—",
        title: `${bDoc?.name ?? "Building"} drives ${share.toFixed(0)}% of load`,
        body: `Demand peaks around ${hh(peakHour)}:00–${hh((peakHour + 1) % 24)}:00, ${above.toFixed(0)}% above its hourly average.`,
        saveBdt: Math.round(bHod[peakHour] * PEAK_REDUCTION * tariff * monthFactor),
        saveLabel: "Save",
        action: "Stagger Peak-Hour Loads",
      });
    }

    // ---------- 3. Off-hours load (22:00 - 06:00) ----------
    const hod: number[] = new Array(24).fill(0);
    hodRaw.forEach((h) => (hod[h._id] = h.total));
    const offKwh = [22, 23, 0, 1, 2, 3, 4, 5].reduce((sum, h) => sum + hod[h], 0);
    const offShare = cur > 0 ? (offKwh / cur) * 100 : 0;
    insights.push({
      id: "offhours",
      tag: "OPTIMIZATION",
      tone: "good",
      scope: "22:00 – 06:00",
      title: "Off-Hours Idle Load",
      body: `${offShare.toFixed(0)}% of consumption (${num(offKwh)} kWh) happens overnight. Cutting idle equipment by ${OFFHOURS_REDUCTION * 100}% reduces waste.`,
      saveBdt: Math.round(offKwh * OFFHOURS_REDUCTION * tariff * monthFactor),
      saveLabel: "Save",
      action: "Schedule Night Setback",
    });

    return Response.json({
      insights,
      monthlySavingsBdt: insights
        .filter((i) => i.saveLabel === "Save" && i.saveBdt)
        .reduce((sum, i) => sum + (i.saveBdt ?? 0), 0),
      recordsAnalyzed,
    });
  } catch (e) {
    return handleServerError(e);
  }
}