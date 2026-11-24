import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError } from "@/lib/api";
import { buildScope } from "@/lib/dashboard-scope";
import { resolveRange } from "@/lib/dashboard-range";
import { csvLine } from "@/lib/csv";
import { Building } from "@/models/Building";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";
import { EnergyRecord } from "@/models/EnergyRecord";

const TZ = "Asia/Dhaka";
const FIELD = { building: "buildingId", department: "departmentId", meter: "meterId" } as const;
type ReportType = keyof typeof FIELD | "daily";
type Named = { _id: Types.ObjectId; name: string; buildingId?: Types.ObjectId };
type Raw = { _id: Types.ObjectId | Date; consumption: number; cost: number };

const ymd = (d: Date) => new Date(d.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10);

export async function GET(req: Request) {
  const { user, error } = await getApiUser();
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") ?? "building") as ReportType;
    if (type !== "daily" && !(type in FIELD)) return apiError("Invalid report type");

    const s = buildScope(user, url);
    if ("error" in s) return apiError(s.error ?? "Invalid scope", s.status);

    const latest = await EnergyRecord.findOne({ organizationId: s.orgId })
      .sort({ timestamp: -1 })
      .select("timestamp")
      .lean<{ timestamp: Date }>();
    const range = resolveRange(url.searchParams, latest?.timestamp ?? new Date());
    const match = { ...s.scope, timestamp: { $gte: range.start, $lt: range.end } };
    const days = Math.max(range.days, 1);

    const groupId =
      type === "daily"
        ? { $dateTrunc: { date: "$timestamp", unit: "day", timezone: TZ } }
        : `$${FIELD[type]}`;

    const raw = await EnergyRecord.aggregate<Raw>([
      { $match: match },
      { $group: { _id: groupId, consumption: { $sum: "$consumption" }, cost: { $sum: "$estimatedCost" } } },
      type === "daily" ? { $sort: { _id: 1 } } : { $sort: { consumption: -1 } },
      { $limit: 500 },
    ]);

    // Naam lookup
    const names = new Map<string, { name: string; detail: string }>();
    if (type !== "daily") {
      const ids = raw.map((r) => r._id as Types.ObjectId);
      if (type === "building") {
        const docs = await Building.find({ _id: { $in: ids } }).select("name").lean<Named[]>();
        docs.forEach((d) => names.set(String(d._id), { name: d.name, detail: "" }));
      } else {
        const docs =
          type === "department"
            ? await Department.find({ _id: { $in: ids } }).select("name buildingId").lean<Named[]>()
            : (
                await Meter.find({ _id: { $in: ids } })
                  .select("meterNumber buildingId")
                  .lean<{ _id: Types.ObjectId; meterNumber: string; buildingId: Types.ObjectId }[]>()
              ).map((m) => ({ _id: m._id, name: m.meterNumber, buildingId: m.buildingId }));
        const buildings = await Building.find({ _id: { $in: docs.map((d) => d.buildingId) } })
          .select("name")
          .lean<Named[]>();
        const bMap = new Map(buildings.map((b) => [String(b._id), b.name]));
        docs.forEach((d) =>
          names.set(String(d._id), { name: d.name, detail: bMap.get(String(d.buildingId)) ?? "" })
        );
      }
    }

    const totalKwh = raw.reduce((a, r) => a + r.consumption, 0);
    const totalCost = raw.reduce((a, r) => a + r.cost, 0);

    const rows = raw.map((r) => {
      const key = type === "daily" ? ymd(r._id as Date) : String(r._id);
      const n = names.get(key);
      return {
        key,
        name: type === "daily" ? key : n?.name ?? "Unknown",
        detail: n?.detail ?? "",
        consumption: Math.round(r.consumption * 100) / 100,
        cost: Math.round(r.cost * 100) / 100,
        share: totalKwh > 0 ? (r.consumption / totalKwh) * 100 : 0,
        avgPerDay: type === "daily" ? r.consumption : r.consumption / days,
      };
    });

    if (url.searchParams.get("format") === "csv") {
      const head =
        type === "daily"
          ? ["date", "consumption_kwh", "cost_bdt"]
          : [type, type === "building" ? "" : "building", "consumption_kwh", "cost_bdt", "share_percent", "avg_per_day_kwh"];
      let csv = "\uFEFF" + csvLine(head);
      for (const r of rows) {
        csv += csvLine(
          type === "daily"
            ? [r.name, r.consumption, r.cost]
            : [r.name, r.detail, r.consumption, r.cost, r.share.toFixed(2), r.avgPerDay.toFixed(2)]
        );
      }
      csv += csvLine(type === "daily" ? ["TOTAL", Math.round(totalKwh * 100) / 100, Math.round(totalCost * 100) / 100] : ["TOTAL", "", Math.round(totalKwh * 100) / 100, Math.round(totalCost * 100) / 100, "100", ""]);
      const file = `wattwise-report-${type}-${ymd(range.start)}_to_${ymd(new Date(range.end.getTime() - 1))}.csv`;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${file}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return Response.json({
      range: { start: range.start, end: range.end, days: range.days },
      rows,
      totals: { consumption: totalKwh, cost: totalCost },
    });
  } catch (e) {
    return handleServerError(e);
  }
}