import fs from "node:fs";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { csvLine } from "@/lib/csv";
import { Organization } from "@/models/Organization";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";
import { EnergyRecord } from "@/models/EnergyRecord";

type Named = { _id: Types.ObjectId; name: string };
type Rec = {
  organizationId: Types.ObjectId;
  meterId: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  departmentId: Types.ObjectId;
  consumption: number;
  estimatedCost: number;
  timestamp: Date;
};

const PER_ORG = 3000; // sample e prottek org theke sesh 3000 record

async function main() {
  await connectDB();
  const [orgs, buildings, floors, depts, meters] = await Promise.all([
    Organization.find().select("name").lean<Named[]>(),
    Building.find().select("name").lean<Named[]>(),
    Floor.find().select("name").lean<Named[]>(),
    Department.find().select("name").lean<Named[]>(),
    Meter.find().select("meterNumber").lean<{ _id: Types.ObjectId; meterNumber: string }[]>(),
  ]);
  const m = (list: Named[]) => new Map(list.map((x) => [String(x._id), x.name]));
  const oMap = m(orgs), bMap = m(buildings), fMap = m(floors), dMap = m(depts);
  const mMap = new Map(meters.map((x) => [String(x._id), x.meterNumber]));

  let csv = csvLine([
    "organization", "meter_id", "building", "floor", "department", "timestamp_utc", "consumption_kwh", "estimated_cost_bdt",
  ]);
  let count = 0;
  for (const org of orgs) {
    const recs = await EnergyRecord.find({ organizationId: org._id })
      .sort({ timestamp: -1 })
      .limit(PER_ORG)
      .lean<Rec[]>();
    for (const r of recs) {
      csv += csvLine([
        oMap.get(String(r.organizationId)) ?? "",
        mMap.get(String(r.meterId)) ?? "",
        bMap.get(String(r.buildingId)) ?? "",
        fMap.get(String(r.floorId)) ?? "",
        dMap.get(String(r.departmentId)) ?? "",
        r.timestamp.toISOString(),
        r.consumption,
        r.estimatedCost,
      ]);
      count++;
    }
  }

  fs.mkdirSync("sample-data", { recursive: true });
  fs.writeFileSync("sample-data/energy-records-sample.csv", "\uFEFF" + csv);
  console.log(`Wrote sample-data/energy-records-sample.csv (${count} rows)`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});