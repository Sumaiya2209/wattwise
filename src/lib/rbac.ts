export type Role =
  | "org_admin"
  | "facility_manager"
  | "department_manager"
  | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  org_admin: "Organization Admin",
  facility_manager: "Facility Manager",
  department_manager: "Department Manager",
  viewer: "Viewer",
};

export const ROLE_BADGES: Record<Role, string> = {
  org_admin: "ORG ADMIN",
  facility_manager: "FACILITY MGR",
  department_manager: "DEPT MANAGER",
  viewer: "VIEWER",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  org_admin:
    "Full multi-building telemetry access, threshold configuration, and organization-wide cost analytics.",
  facility_manager:
    "Meter management, consumption thresholds, alert handling, and energy reports.",
  department_manager:
    "Department-level energy usage, cost monitoring, and saving opportunities.",
  viewer: "Read-only access to dashboards, analytics, and historical reports.",
};

export type Permission =
  | "manage_structure"
  | "manage_users"
  | "manage_meters"
  | "manage_alerts"
  | "generate_reports";

const PERMISSIONS: Record<Role, Permission[]> = {
  org_admin: ["manage_structure", "manage_users", "manage_meters", "generate_reports"],
  facility_manager: ["manage_meters", "manage_alerts", "generate_reports"],
  department_manager: ["generate_reports"],
  viewer: [],
};

export function can(role: string | null | undefined, permission: Permission) {
  if (!role || !(role in PERMISSIONS)) return false;
  return PERMISSIONS[role as Role].includes(permission);
}

const ALL: Role[] = ["org_admin", "facility_manager", "department_manager", "viewer"];

export type NavGroup = "Telemetry & Control" | "Management" | "Data & Account";

export const NAV_GROUPS: NavGroup[] = ["Telemetry & Control", "Management", "Data & Account"];

export const NAV_ITEMS: {
  label: string;
  href: string;
  icon: string;
  group: NavGroup;
  roles: Role[];
}[] = [
  { label: "Command Dashboard", href: "/dashboard", icon: "dashboard", group: "Telemetry & Control", roles: ALL },
  { label: "Time-Series Analytics", href: "/analytics", icon: "analytics", group: "Telemetry & Control", roles: ALL },
  { label: "Energy Insights", href: "/insights", icon: "insights", group: "Telemetry & Control", roles: ALL },
  { label: "Threshold Alerts", href: "/alerts", icon: "alerts", group: "Telemetry & Control", roles: ["org_admin", "facility_manager"] },
  { label: "Smart Meters Grid", href: "/meters", icon: "meters", group: "Telemetry & Control", roles: ["org_admin", "facility_manager"] },
  { label: "Buildings", href: "/buildings", icon: "buildings", group: "Management", roles: ["org_admin"] },
  { label: "Floors", href: "/floors", icon: "floors", group: "Management", roles: ["org_admin"] },
  { label: "Departments", href: "/departments", icon: "departments", group: "Management", roles: ["org_admin"] },
  { label: "Users", href: "/users", icon: "users", group: "Management", roles: ["org_admin"] },
  { label: "Energy Records", href: "/records", icon: "records", group: "Data & Account", roles: ALL },
  { label: "Reports", href: "/reports", icon: "reports", group: "Data & Account", roles: ALL },
  { label: "Profile", href: "/profile", icon: "profile", group: "Data & Account", roles: ALL },
];