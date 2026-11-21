import { Types } from "mongoose";

type U = { organizationId?: unknown; role?: unknown; departmentId?: unknown };

// Org + optional building + (department manager hole nijer department)
export function buildScope(user: U, url: URL) {
  const orgId = new Types.ObjectId(String(user.organizationId));
  const scope: Record<string, unknown> = { organizationId: orgId };

  const building = url.searchParams.get("building");
  if (building) {
    if (!Types.ObjectId.isValid(building)) return { error: "Invalid building", status: 400 } as const;
    scope.buildingId = new Types.ObjectId(building);
  }
  if (user.role === "department_manager") {
    if (!user.departmentId) return { error: "No department assigned", status: 403 } as const;
    scope.departmentId = new Types.ObjectId(String(user.departmentId));
  }
  return { orgId, scope } as const;
}