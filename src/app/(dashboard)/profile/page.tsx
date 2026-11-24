import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Organization } from "@/models/Organization";
import { Department } from "@/models/Department";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const user = await requireUser();
  await connectDB();

  const org = await Organization.findById(user.organizationId).select("name").lean<{ name: string }>();
  const dept =
    user.departmentId && Types.ObjectId.isValid(user.departmentId as string)
      ? await Department.findById(user.departmentId).select("name").lean<{ name: string }>()
      : null;

  return (
    <ProfileClient
      name={user.name}
      email={user.email}
      role={user.role as string}
      orgName={org?.name ?? "—"}
      departmentName={dept?.name ?? null}
    />
  );
}