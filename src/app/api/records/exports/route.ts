import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError } from "@/lib/api";
import { buildRecordFilter } from "@/lib/records-filter";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";
import { EnergyRecord } from "@/models/EnergyRecord";

const MAX_ROWS = 200_000;

type RecDoc = {
  meterId: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  departmentId: Types.ObjectId;
  consumption: number;
  estimatedCost: number;
  timestamp: Date;
};
type Named = { _id: Types.ObjectId; name: string };

function esc(v: string | number) {
  let s = String(v);
  // CSV injection thekano (Excel formula)
  if (typeof v === "string" && /^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function bdt(d: Date) {
  return new Date(d.getTime() + 6 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 16);
}

export async function GET(req: Request) {
  const { user, error } = await getApiUser();
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const f = await buildRecordFilter(user, url);
    if ("error" in f) return apiError(f.error ?? "Unable to build record filter", f.status);

    // Naam gulo ekbar-i load (org e kom thake)
    const [meters, buildings, floors, depts] = await Promise.all([
      Meter.find({ organizationId: f.orgId }).select("meterNumber").lean<{ _id: Types.ObjectId; meterNumber: string }[]>(),
      Building.find({ organizationId: f.orgId }).select("name").lean<Named[]>(),
      Floor.find({ organizationId: f.orgId }).select("name").lean<Named[]>(),
      Department.find({ organizationId: f.orgId }).select("name").lean<Named[]>(),
    ]);
    const mMap = new Map(meters.map((x) => [String(x._id), x.meterNumber]));
    const bMap = new Map(buildings.map((x) => [String(x._id), x.name]));
    const fMap = new Map(floors.map((x) => [String(x._id), x.name]));
    const dMap = new Map(depts.map((x) => [String(x._id), x.name]));

    const recordFilter = "filter" in f ? f.filter : f.scope;
    const raw = EnergyRecord.find(recordFilter).sort({ timestamp: -1 }).limit(MAX_ROWS).lean().cursor();
    const iter = raw as unknown as AsyncIterable<RecDoc>;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode("\uFEFFtimestamp_bdt,meter_id,building,floor,department,consumption_kwh,estimated_cost_bdt\r\n")
          );
          for await (const r of iter) {
            const line = [
              bdt(r.timestamp),
              mMap.get(String(r.meterId)) ?? "",
              bMap.get(String(r.buildingId)) ?? "",
              fMap.get(String(r.floorId)) ?? "",
              dMap.get(String(r.departmentId)) ?? "",
              r.consumption,
              r.estimatedCost,
            ]
              .map(esc)
              .join(",");
            controller.enqueue(encoder.encode(line + "\r\n"));
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
      cancel() {
        void raw.close();
      },
    });

    const day = new Date().toISOString().slice(0, 10);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="wattwise-energy-records-${day}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleServerError(e);
  }
}