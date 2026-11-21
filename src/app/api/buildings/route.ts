import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, escapeRegex, handleServerError, parsePagination } from "@/lib/api";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";

type BuildingDoc = {
  _id: Types.ObjectId;
  name: string;
  address?: string;
  createdAt: Date;
};

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  address: z.string().trim().max(200).optional(),
});

export async function GET(req: Request) {
  const { user, error } = await getApiUser(); // sob role read korte pare
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url);
    const search = url.searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(user.organizationId as string),
    };
    if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };

    const [docs, total] = await Promise.all([
      Building.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<BuildingDoc[]>(),
      Building.countDocuments(filter),
    ]);

    const counts = await Floor.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { buildingId: { $in: docs.map((d) => d._id) } } },
      { $group: { _id: "$buildingId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    return Response.json({
      data: docs.map((d) => ({
        ...d,
        _id: String(d._id),
        floorsCount: countMap.get(String(d._id)) ?? 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    return handleServerError(e);
  }
}

export async function POST(req: Request) {
  const { user, error } = await getApiUser(["org_admin"]);
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    await connectDB();
    const doc = await Building.create({
      organizationId: user.organizationId,
      name: parsed.data.name,
      address: parsed.data.address || undefined,
    });
    return Response.json(doc, { status: 201 });
  } catch (e) {
    return handleServerError(e);
  }
}