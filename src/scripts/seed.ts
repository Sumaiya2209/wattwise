import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calculateCost } from "@/lib/cost";
import { Organization } from "@/models/Organization";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Department } from "@/models/Department";
import { Meter } from "@/models/Meter";
import { EnergyRecord } from "@/models/EnergyRecord";
import { Threshold } from "@/models/Threshold";
import { Alert } from "@/models/Alert";

type OrgType = "office" | "factory" | "university" | "commercial";

const ORGS: {
  name: string;
  type: OrgType;
  tariff: number;
  slug: string;
  buildings: string[];
}[] = [
  {
    name: "BrightEdge Textiles Ltd",
    type: "factory",
    tariff: 9.5,
    slug: "brightedge",
    buildings: ["Spinning Unit", "Weaving Unit", "Dyeing Unit", "Admin Block"],
  },
  {
    name: "Sylhet Metropolitan University",
    type: "university",
    tariff: 7.5,
    slug: "smu",
    buildings: ["Academic Block A", "Academic Block B", "Library", "Science Lab"],
  },
  {
    name: "Zenith Corporate Tower",
    type: "commercial",
    tariff: 10,
    slug: "zenith",
    buildings: ["North Tower", "South Tower", "Annex", "Parking Complex"],
  },
];

const DEPT_NAMES = [
  "Administration", "Accounts", "HR", "IT", "Production", "Maintenance",
  "Research", "Sales", "Security", "Cafeteria", "Training", "Logistics",
];

const FLOORS_PER_BUILDING = 3;
const DEPTS_PER_FLOOR = 2;
const DAYS = 60;
const BATCH_SIZE = 5000;
const DEMO_PASSWORD = "Demo@1234";

const BASE_KWH: Record<OrgType, number> = {
  factory: 25,
  university: 10,
  commercial: 12,
  office: 6,
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function hourFactor(type: OrgType, bdHour: number) {
  if (type === "factory") return bdHour >= 6 && bdHour < 22 ? 1.4 : 0.7;
  if (bdHour >= 8 && bdHour < 18) return 1.5;
  if (bdHour >= 18 && bdHour < 22) return 0.9;
  return 0.4;
}

function dayFactor(type: OrgType, bdDay: number) {
  const weekend = bdDay === 5 || bdDay === 6; // Fri, Sat
  if (!weekend) return 1;
  return type === "factory" ? 0.8 : 0.5;
}

async function wipe() {
  console.log("Purging old data...");
  await Promise.all([
    Organization.deleteMany({}),
    Building.deleteMany({}),
    Floor.deleteMany({}),
    Department.deleteMany({}),
    Meter.deleteMany({}),
    EnergyRecord.deleteMany({}),
    Threshold.deleteMany({}),
    Alert.deleteMany({}),
  ]);
  const db = mongoose.connection.db!;
  for (const name of ["user", "account", "session", "verification"]) {
    await db.collection(name).deleteMany({});
  }
}

async function createUser(
  email: string,
  name: string,
  role: string,
  organizationId: Types.ObjectId,
  departmentId?: Types.ObjectId
) {
  await auth.api.signUpEmail({
    body: { email, password: DEMO_PASSWORD, name },
  });
  await mongoose.connection.db!.collection("user").updateOne(
    { email },
    {
      $set: {
        role,
        organizationId: organizationId.toString(),
        ...(departmentId ? { departmentId: departmentId.toString() } : {}),
      },
    }
  );
}

async function main() {
  await connectDB();
  await wipe();

  const credentials: { role: string; email: string; org: string }[] = [];
  let totalBuildings = 0;
  let totalFloors = 0;
  let totalDepts = 0;
  let totalMeters = 0;
  let totalRecords = 0;

  // time range: last 60 days, hourly
  const end = new Date();
  end.setMinutes(0, 0, 0);
  const start = new Date(end.getTime() - DAYS * 24 * 3600 * 1000);

  for (const org of ORGS) {
    console.log(`\nSeeding ${org.name}...`);
    const organization = await Organization.create({
      name: org.name,
      type: org.type,
      address: "Sylhet, Bangladesh",
      contactEmail: `info@${org.slug}.com`,
      tariffPerKwh: org.tariff,
    });

    const orgMeters: {
      _id: Types.ObjectId;
      buildingId: Types.ObjectId;
      floorId: Types.ObjectId;
      departmentId: Types.ObjectId;
      multiplier: number;
    }[] = [];
    let firstDeptId: Types.ObjectId | undefined;
    let deptCounter = 0;
    let meterCounter = 0;

    for (const bName of org.buildings) {
      const building = await Building.create({
        organizationId: organization._id,
        name: bName,
        address: "Sylhet, Bangladesh",
        totalFloors: FLOORS_PER_BUILDING,
      });
      totalBuildings++;

      for (let level = 1; level <= FLOORS_PER_BUILDING; level++) {
        const floor = await Floor.create({
          organizationId: organization._id,
          buildingId: building._id,
          name: `Floor ${level}`,
          level,
        });
        totalFloors++;

        for (let d = 0; d < DEPTS_PER_FLOOR; d++) {
          const dept = await Department.create({
            organizationId: organization._id,
            buildingId: building._id,
            floorId: floor._id,
            name: `${DEPT_NAMES[deptCounter % DEPT_NAMES.length]} (${bName.split(" ")[0]}-F${level})`,
          });
          deptCounter++;
          totalDepts++;
          firstDeptId ??= dept._id;

          meterCounter++;
          const meter = await Meter.create({
            organizationId: organization._id,
            buildingId: building._id,
            floorId: floor._id,
            departmentId: dept._id,
            meterNumber: `${org.slug.toUpperCase()}-M-${String(meterCounter).padStart(4, "0")}`,
            type: "sub",
            status: "active",
            lastReadingAt: end,
          });
          totalMeters++;
          orgMeters.push({
            _id: meter._id,
            buildingId: building._id,
            floorId: floor._id,
            departmentId: dept._id,
            multiplier: rand(0.6, 1.6),
          });
        }
      }
    }

    // energy records
    let batch: object[] = [];
    for (const m of orgMeters) {
      for (let t = start.getTime(); t < end.getTime(); t += 3600 * 1000) {
        const ts = new Date(t);
        const bd = new Date(t + 6 * 3600 * 1000); // Bangladesh time (UTC+6)
        let kwh =
          BASE_KWH[org.type] *
          m.multiplier *
          hourFactor(org.type, bd.getUTCHours()) *
          dayFactor(org.type, bd.getUTCDay()) *
          rand(0.85, 1.15);
        if (Math.random() < 0.003) kwh *= rand(2.5, 3.5); // anomaly spike
        kwh = Math.round(kwh * 100) / 100;

        batch.push({
          organizationId: organization._id,
          meterId: m._id,
          buildingId: m.buildingId,
          floorId: m.floorId,
          departmentId: m.departmentId,
          consumption: kwh,
          timestamp: ts,
          estimatedCost: calculateCost(kwh, org.tariff),
        });

        if (batch.length >= BATCH_SIZE) {
          await EnergyRecord.insertMany(batch, { ordered: false });
          totalRecords += batch.length;
          batch = [];
          process.stdout.write(`\r  records inserted: ${totalRecords}`);
        }
      }
    }
    if (batch.length) {
      await EnergyRecord.insertMany(batch, { ordered: false });
      totalRecords += batch.length;
    }

    // demo users (4 roles)
    const roles = [
      { role: "org_admin", key: "admin", name: `${org.slug} Admin` },
      { role: "facility_manager", key: "facility", name: `${org.slug} Facility Manager` },
      { role: "department_manager", key: "dept", name: `${org.slug} Dept Manager` },
      { role: "viewer", key: "viewer", name: `${org.slug} Viewer` },
    ];
    for (const r of roles) {
      const email = `${r.key}@${org.slug}.com`;
      await createUser(
        email,
        r.name,
        r.role,
        organization._id,
        r.role === "department_manager" ? firstDeptId : undefined
      );
      credentials.push({ role: r.role, email, org: org.name });
    }
    if (firstDeptId) {
      await Department.updateOne(
        { _id: firstDeptId },
        { managerId: `dept@${org.slug}.com` }
      );
    }
  }

  console.log("\n\n===== DONE =====");
  console.log({
    organizations: ORGS.length,
    buildings: totalBuildings,
    floors: totalFloors,
    departments: totalDepts,
    meters: totalMeters,
    energyRecords: totalRecords,
  });
  console.log(`\nDemo password (all users): ${DEMO_PASSWORD}`);
  console.table(credentials);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});