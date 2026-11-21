import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Organization } from "@/models/Organization";
import { EnergyRecord } from "@/models/EnergyRecord";

export default async function DashboardPage() {
  const user = await requireUser();
  await connectDB();

  const org = await Organization.findById(user.organizationId).lean<{ name: string }>();
  const recordCount = await EnergyRecord.countDocuments({
    organizationId: user.organizationId,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {user.name}</h1>
      <p className="mt-1 text-gray-500 dark:text-gray-400">{org?.name}</p>
      <div className="mt-6 rounded-xl bg-white p-6 shadow dark:bg-gray-900">
        <p className="text-sm text-gray-500">Energy records in your organization</p>
        <p className="text-3xl font-bold text-emerald-600">
          {recordCount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}