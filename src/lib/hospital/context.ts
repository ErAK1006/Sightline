import { getSql, type Sql } from "@/lib/db";
import { isRole, type Role } from "./roles";
import type { Hospital, Lookups, Staff } from "./types";

export function freeze<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function db() {
  return getSql();
}

export function nid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function asRole(value: unknown, fallback: Role): Role {
  return isRole(String(value)) ? (value as Role) : fallback;
}

function mapStaff(row: Record<string, unknown>): Staff {
  const role = asRole(row.role, "department_user");
  const view = row.view_as_role ? asRole(row.view_as_role, role) : null;
  return {
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : null,
    name: String(row.name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    role,
    view_as_role: view,
    effective_role: view ?? role,
    department_id: row.department_id ? String(row.department_id) : null,
    vendor_id: row.vendor_id ? String(row.vendor_id) : null,
    status: String(row.status ?? "active"),
  };
}

export async function ensureStaff(sql: Sql, userId: string): Promise<Staff> {
  const mine = await sql.query<Record<string, unknown>>(
    "select * from staff where user_id = $1 and deleted_at is null limit 1",
    [userId],
  );
  if (mine[0]) return mapStaff(mine[0]);

  const authUser = await sql.query<{ email: string; name: string }>(
    `select email, name from "user" where id = $1 limit 1`,
    [userId],
  );
  const email = (authUser[0]?.email ?? "").toLowerCase();
  const name = authUser[0]?.name || email.split("@")[0] || "Staff member";

  if (email) {
    const byEmail = await sql.query<Record<string, unknown>>(
      "select * from staff where lower(email) = $1 and deleted_at is null limit 1",
      [email],
    );
    if (byEmail[0]) {
      await sql.query("update staff set user_id = $1, updated_at = now() where id = $2", [
        userId,
        byEmail[0].id,
      ]);
      return mapStaff({ ...byEmail[0], user_id: userId });
    }
  }

  const claimed = await sql.query<{ n: number }>(
    "select count(*)::int as n from staff where user_id is not null",
  );
  const isFirst = (claimed[0]?.n ?? 0) === 0;
  const id = nid("stf");
  const role: Role = isFirst ? "super_admin" : "department_user";
  await sql.query(
    `insert into staff (id, user_id, name, email, role, status) values ($1,$2,$3,$4,$5,'active')`,
    [id, userId, name, email || `${userId.slice(0, 8)}@helioseye.local`, role],
  );
  await sql.query(
    `insert into notifications (id, staff_id, user_id, kind, title, body) values ($1,$2,$3,'assigned_task',$4,$5)`,
    [
      nid("nt"),
      id,
      userId,
      "Welcome to Sightline",
      isFirst
        ? "You are Super Admin for Helios Eye Hospital. Review open breakdowns on the dashboard."
        : "Your profile is a department user. Ask a facility manager to assign your operational role.",
    ],
  );
  const created = await sql.query<Record<string, unknown>>("select * from staff where id = $1", [id]);
  return mapStaff(created[0]);
}

export async function loadHospital(sql: Sql): Promise<Hospital> {
  const rows = await sql.query<Hospital>("select id, name, campus, city, beds, ot_count from hospital_settings limit 1");
  return (
    rows[0] ?? {
      id: "default",
      name: "Helios Eye Hospital",
      campus: "Jayanagar Campus",
      city: "Bengaluru",
      beds: 80,
      ot_count: 4,
    }
  );
}

export async function loadLookups(sql: Sql): Promise<Lookups> {
  const [departments, locations, categories, staff, vendors, checklists, assets] = await Promise.all([
    sql.query<LookupRow>("select id, name from departments order by name"),
    sql.query<LookupRow>("select id, name from locations order by name"),
    sql.query<LookupRow>("select id, name from asset_categories order by sort_order"),
    sql.query<LookupRow>("select id, name, role as extra from staff where deleted_at is null and status = 'active' order by name"),
    sql.query<LookupRow>("select id, name from vendors where deleted_at is null order by name"),
    sql.query<LookupRow>("select id, name, kind as extra from checklists order by name"),
    sql.query<LookupRow>("select id, name, asset_code as extra from assets where deleted_at is null order by asset_code"),
  ]);
  return { departments, locations, categories, staff, vendors, checklists, assets };
}

type LookupRow = { id: string; name: string; extra?: string | null };

export async function audit(
  sql: Sql,
  staff: Staff,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  previousValue?: unknown,
  newValue?: unknown,
) {
  await sql.query(
    `insert into audit_logs (id, user_id, staff_id, action, entity_type, entity_id, previous_value, new_value)
     values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
    [
      nid("aud"),
      userId,
      staff.id,
      action,
      entityType,
      entityId,
      previousValue == null ? null : JSON.stringify(previousValue),
      newValue == null ? null : JSON.stringify(newValue),
    ],
  );
}

export async function notify(
  sql: Sql,
  staffId: string | null | undefined,
  kind: string,
  title: string,
  body: string,
  refType?: string,
  refId?: string,
) {
  if (!staffId) return;
  await sql.query(
    `insert into notifications (id, staff_id, kind, title, body, ref_type, ref_id) values ($1,$2,$3,$4,$5,$6,$7)`,
    [nid("nt"), staffId, kind, title, body, refType ?? null, refId ?? null],
  );
}

export async function nextNumber(sql: Sql, table: string, column: string, prefix: string) {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const rows = await sql.query<{ n: string }>(
    `select ${column} as n from ${table} where ${column} like $1 order by ${column} desc limit 1`,
    [like],
  );
  const last = rows[0]?.n ? Number(rows[0].n.split("-").pop()) : 0;
  return `${prefix}-${year}-${String((Number.isFinite(last) ? last : 0) + 1).padStart(5, "0")}`;
}

export function minutesBetween(start: string | Date | null | undefined, end: string | Date | null | undefined) {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 60000);
}
