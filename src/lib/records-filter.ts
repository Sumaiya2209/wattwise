import { Types } from "mongoose";
import { escapeRegex } from "@/lib/api";
import { buildScope } from "@/lib/dashboard-scope";
import { Meter } from "@/models/Meter";

const DAY = 24 * 3600 * 1000;

type U = { organizationId?: unknown; role?: unknown; departmentId?: unknown };

function parseDay(v: string | null) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00+06:00`); // Bangladesh time
  return isNaN(d.getTime()) ? null : d;
}

export async function buildRecordFilter(user: U, url: URL) {
  const s = buildScope(user, url);
  if ("error" in s) return s;

  const filter: Record<string, unknown> = { ...s.scope };

  // Department filter (department manager er scope override kora jabe na)
  const dept = url.searchParams.get("department");
  if (dept && user.role !== "department_manager") {
    if (!Types.ObjectId.isValid(dept)) return { error: "Invalid department", status: 400 } as const;
    filter.departmentId = new Types.ObjectId(dept);
  }

  const from = parseDay(url.searchParams.get("from"));
  const to = parseDay(url.searchParams.get("to"));
  const ts: Record<string, Date> = {};
  if (from) ts.$gte = from;
  if (to) ts.$lt = new Date(to.getTime() + DAY);
  if (Object.keys(ts).length) filter.timestamp = ts;

  const search = url.searchParams.get("search")?.trim();
  if (search) {
    const meters = await Meter.find({
      organizationId: s.orgId,
      meterNumber: { $regex: escapeRegex(search), $options: "i" },
    })
      .select("_id")
      .limit(200)
      .lean<{ _id: Types.ObjectId }[]>();
    filter.meterId = { $in: meters.map((m) => m._id) };
  }

  return { orgId: s.orgId, filter } as const;
}