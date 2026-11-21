import { Types } from "mongoose";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Role } from "@/lib/rbac";
import { Organization } from "@/models/Organization";
import { Building } from "@/models/Building";
import { Floor } from "@/models/Floor";
import { Meter } from "@/models/Meter";
import { EnergyRecord } from "@/models/EnergyRecord";
import { Alert } from "@/models/Alert";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await connectDB();
  const orgId = new Types.ObjectId(user.organizationId as string);

  const [org, buildings, floors, meters, records, alertsNew] = await Promise.all([
    Organization.findById(orgId).select("name tariffPerKwh").lean<{ name: string; tariffPerKwh: number }>(),
    Building.countDocuments({ organizationId: orgId }),
    Floor.countDocuments({ organizationId: orgId }),
    Meter.countDocuments({ organizationId: orgId }),
    EnergyRecord.countDocuments({ organizationId: orgId }),
    Alert.countDocuments({ organizationId: orgId, status: "new" }),
  ]);

  return (
    <DashboardShell
      user={{ name: user.name, role: user.role as Role }}
      org={{
        name: org?.name ?? "Organization",
        tariff: org?.tariffPerKwh ?? 8,
        buildings,
        floors,
        meters,
        records,
      }}
      alertsNew={alertsNew}
    >
      {children}
    </DashboardShell>
  );
}