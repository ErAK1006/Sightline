export const ROLES = [
  "super_admin",
  "hospital_management",
  "facility_manager",
  "engineering_manager",
  "maintenance_engineer",
  "technician",
  "biomedical_engineer",
  "electrical_engineer",
  "hvac_engineer",
  "housekeeping_supervisor",
  "security_safety",
  "department_user",
  "vendor",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  hospital_management: "Hospital Management",
  facility_manager: "Facility Manager",
  engineering_manager: "Engineering Manager",
  maintenance_engineer: "Maintenance Engineer",
  technician: "Technician",
  biomedical_engineer: "Biomedical Engineer",
  electrical_engineer: "Electrical Engineer",
  hvac_engineer: "HVAC Engineer",
  housekeeping_supervisor: "Housekeeping Supervisor",
  security_safety: "Security / Safety",
  department_user: "Department User",
  vendor: "Vendor / Contractor",
};

const ALL = new Set(ROLES);

export type Perm =
  | "dashboard"
  | "assets"
  | "assets.write"
  | "breakdowns"
  | "breakdowns.write"
  | "work_orders"
  | "work_orders.write"
  | "pm"
  | "pm.write"
  | "logbooks"
  | "logbooks.write"
  | "inspections"
  | "inspections.write"
  | "utilities"
  | "inventory"
  | "inventory.write"
  | "vendors"
  | "vendors.write"
  | "contracts"
  | "calibration"
  | "calibration.write"
  | "safety"
  | "housekeeping"
  | "housekeeping.write"
  | "incidents"
  | "incidents.write"
  | "reports"
  | "documents"
  | "settings"
  | "staff.admin"
  | "approve";

const full: Perm[] = [
  "dashboard", "assets", "assets.write", "breakdowns", "breakdowns.write",
  "work_orders", "work_orders.write", "pm", "pm.write", "logbooks", "logbooks.write",
  "inspections", "inspections.write", "utilities", "inventory", "inventory.write",
  "vendors", "vendors.write", "contracts", "calibration", "calibration.write",
  "safety", "housekeeping", "housekeeping.write", "incidents", "incidents.write",
  "reports", "documents", "settings", "approve",
];

const MATRIX: Record<Role, Perm[]> = {
  super_admin: [...full, "staff.admin"],
  hospital_management: ["dashboard", "assets", "breakdowns", "work_orders", "pm", "utilities", "contracts", "calibration", "safety", "incidents", "reports", "documents", "approve"],
  facility_manager: full,
  engineering_manager: full.filter((p) => p !== "staff.admin"),
  maintenance_engineer: ["dashboard", "assets", "breakdowns", "breakdowns.write", "work_orders", "work_orders.write", "pm", "pm.write", "logbooks", "logbooks.write", "inspections", "inspections.write", "inventory", "calibration", "incidents", "incidents.write", "documents"],
  technician: ["dashboard", "assets", "breakdowns", "breakdowns.write", "work_orders", "work_orders.write", "pm", "pm.write", "logbooks", "logbooks.write", "inspections", "inspections.write", "inventory"],
  biomedical_engineer: ["dashboard", "assets", "breakdowns", "breakdowns.write", "work_orders", "work_orders.write", "pm", "pm.write", "logbooks", "logbooks.write", "calibration", "calibration.write", "contracts", "vendors", "inventory", "incidents", "documents"],
  electrical_engineer: ["dashboard", "assets", "breakdowns", "breakdowns.write", "work_orders", "work_orders.write", "pm", "pm.write", "logbooks", "logbooks.write", "inspections", "utilities", "inventory"],
  hvac_engineer: ["dashboard", "assets", "breakdowns", "breakdowns.write", "work_orders", "work_orders.write", "pm", "pm.write", "logbooks", "logbooks.write", "inspections", "utilities"],
  housekeeping_supervisor: ["dashboard", "breakdowns", "breakdowns.write", "housekeeping", "housekeeping.write", "inspections", "inspections.write", "incidents", "incidents.write"],
  security_safety: ["dashboard", "assets", "breakdowns", "breakdowns.write", "inspections", "inspections.write", "safety", "incidents", "incidents.write", "documents"],
  department_user: ["dashboard", "assets", "breakdowns", "breakdowns.write", "work_orders", "work_orders.write"],
  vendor: ["dashboard", "work_orders", "work_orders.write", "breakdowns", "pm"],
};

export function isRole(value: string | null | undefined): value is Role {
  return !!value && (ALL as Set<string>).has(value);
}

export function can(role: string | null | undefined, perm: Perm) {
  if (!isRole(role)) return false;
  return MATRIX[role].includes(perm);
}

export function assignedOnly(role: string | null | undefined) {
  return role === "technician" || role === "vendor" || role === "department_user";
}

export const PRIORITY_TONE = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
} as const;

export const STATUS_TONE: Record<string, "neutral" | "primary" | "success" | "warning" | "danger" | "info"> = {
  operational: "success",
  maintenance: "warning",
  down: "danger",
  retired: "neutral",
  open: "danger",
  assigned: "info",
  in_progress: "warning",
  pending_spares: "warning",
  pending_vendor: "warning",
  on_hold: "warning",
  resolved: "primary",
  verified: "primary",
  completed: "success",
  closed: "success",
  cancelled: "neutral",
  requested: "info",
  approved: "primary",
  scheduled: "info",
  due: "warning",
  overdue: "danger",
  missed: "danger",
  investigating: "warning",
  active: "success",
  expired: "danger",
};

export function labelize(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
