import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { getApiUser } from "@/lib/session";
import { handleServerError } from "@/lib/api";
import { runAlertEngine } from "@/lib/alert-engine";

export async function POST() {
  const { user, error } = await getApiUser(["org_admin", "facility_manager"]);
  if (error) return error;

  try {
    await connectDB();
    const result = await runAlertEngine(new Types.ObjectId(user.organizationId as string), user.id);
    return Response.json(result);
  } catch (e) {
    return handleServerError(e);
  }
}