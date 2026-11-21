import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { apiError, handleServerError, isValidId } from "@/lib/api";
import { Alert } from "@/models/Alert";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ status: z.enum(["acknowledged", "resolved"]) });

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, error } = await getApiUser(["org_admin", "facility_manager"]);
  if (error) return error;
  if (!isValidId(id)) return apiError("Invalid id");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid status");

  try {
    await connectDB();
    const alert = await Alert.findOne({ _id: id, organizationId: user.organizationId });
    if (!alert) return apiError("Alert not found", 404);

    const next = parsed.data.status;
    if (alert.status === "resolved") return apiError("Alert is already resolved", 409);
    if (next === "acknowledged" && alert.status !== "new") {
      return apiError("Only new alerts can be acknowledged", 409);
    }

    if (next === "acknowledged") {
      alert.status = "acknowledged";
      alert.acknowledgedBy = user.id;
      alert.acknowledgedAt = new Date();
    } else {
      alert.status = "resolved";
      alert.resolvedBy = user.id;
      alert.resolvedAt = new Date();
    }
    await alert.save();
    return Response.json({ success: true, status: alert.status });
  } catch (e) {
    return handleServerError(e);
  }
}