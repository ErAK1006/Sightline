import type { Role } from "./roles";

export type Staff = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  view_as_role: Role | null;
  effective_role: Role;
  department_id: string | null;
  vendor_id: string | null;
  status: string;
};

export type Hospital = {
  id: string;
  name: string;
  campus: string | null;
  city: string | null;
  beds: number | null;
  ot_count: number | null;
};

export type LookupItem = { id: string; name: string; extra?: string | null };

export type Lookups = {
  departments: LookupItem[];
  locations: LookupItem[];
  categories: LookupItem[];
  staff: LookupItem[];
  vendors: LookupItem[];
  checklists: LookupItem[];
  assets: LookupItem[];
};

export type Bootstrap = {
  staff: Staff;
  hospital: Hospital;
  unread: number;
  lookups: Lookups;
};

export type DashboardData = {
  kpis: Record<string, number>;
  breakdownTrend: { day: string; count: number }[];
  pmCompliance: { name: string; value: number }[];
  complaintsByDept: { name: string; count: number }[];
  assetBreakdowns: { name: string; count: number }[];
  energy: { day: string; kwh: number }[];
  water: { day: string; kl: number }[];
  technicians: { name: string; open: number; completed: number }[];
  costs: { month: string; maintenance: number; spares: number }[];
  openCritical: Array<Record<string, unknown>>;
  duePm: Array<Record<string, unknown>>;
  expiring: Array<Record<string, unknown>>;
};
