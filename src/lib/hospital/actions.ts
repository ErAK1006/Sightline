import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { can } from "./roles";
import {
  audit,
  db,
  ensureStaff,
  freeze,
  loadHospital,
  loadLookups,
  minutesBetween,
  nextNumber,
  nid,
  notify,
} from "./context";
import type { Bootstrap, DashboardData } from "./types";

async function ctx(userId: string) {
  const sql = await db();
  const staff = await ensureStaff(sql, userId);
  return { sql, staff, userId };
}

function where(parts: Array<[string, ...unknown[]] | string>) {
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === "string") {
      clauses.push(part);
      continue;
    }
    let [frag, ...vals] = part;
    for (const v of vals) {
      params.push(v);
      frag = frag.replace("?", `$${params.length}`);
    }
    clauses.push(frag);
  }
  return { sql: clauses.join(" and "), params };
}

export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Bootstrap> => {
    const { sql, staff } = await ctx(context.userId);
    const [hospital, lookups, unreadRows] = await Promise.all([
      loadHospital(sql),
      loadLookups(sql),
      sql.query<{ n: number }>(
        "select count(*)::int as n from notifications where staff_id = $1 and read_at is null",
        [staff.id],
      ),
    ]);
    return freeze({ staff, hospital, unread: unreadRows[0]?.n ?? 0, lookups });
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardData> => {
    const { sql } = await ctx(context.userId);
    const kpis = await sql.query<Record<string, number>>(`
      select
        (select count(*)::int from assets where deleted_at is null) as total_assets,
        (select count(*)::int from contracts c where c.contract_type = 'AMC' and c.status = 'active' and c.end_date >= current_date) as assets_amc,
        (select count(*)::int from contracts c where c.contract_type = 'CMC' and c.status = 'active' and c.end_date >= current_date) as assets_cmc,
        (select count(*)::int from breakdowns where status not in ('closed','cancelled','verified')) as open_complaints,
        (select count(*)::int from breakdowns where status not in ('closed','cancelled')) as open_breakdowns,
        (select count(*)::int from breakdowns where status not in ('closed','cancelled') and (priority = 'critical' or criticality = 'critical')) as critical_breakdowns,
        (select count(*)::int from pm_records where status in ('scheduled','due') and scheduled_date <= current_date) as pending_pm,
        (select count(*)::int from pm_records where status = 'completed' and scheduled_date >= date_trunc('month', current_date)) as completed_pm,
        (select count(*)::int from pm_records where (status in ('overdue','missed') or (status in ('scheduled','due') and scheduled_date < current_date))) as overdue_pm,
        (select count(*)::int from pm_records where scheduled_date = current_date and status not in ('completed','cancelled'))
          + (select count(*)::int from work_orders where planned_date = current_date and status not in ('closed','cancelled')) as today_tasks,
        (select count(*)::int from work_orders where status not in ('closed','cancelled','verified','completed')) as pending_wo,
        coalesce((select avg(resolution_minutes)::int from breakdowns where resolution_minutes is not null), 0) as mttr,
        coalesce((select
           case when count(*) filter (where status in ('closed','verified','resolved')) = 0 then 0
           else (30.0 * 24 * 60 * (select count(*) from assets where deleted_at is null)
             / nullif(count(*) filter (where reported_at >= now() - interval '30 days'),0))::int
           end
         from breakdowns where reported_at >= now() - interval '30 days'), 0) as mtbf,
        (select count(*)::int from calibrations where due_date < current_date) as overdue_cal,
        (select count(*)::int from calibrations where due_date between current_date and current_date + 30) as expiring_cal,
        (select count(*)::int from contracts where end_date between current_date and current_date + 30) as expiring_amc,
        (select count(*)::int from contracts where end_date < current_date) as expired_contracts,
        (select count(*)::int from spares where current_stock <= min_stock) as low_stock,
        (select count(*)::int from incidents where status not in ('closed','cancelled')) as open_incidents,
        coalesce((select sum(cost) from breakdowns where reported_at >= date_trunc('month', current_date)),0) as month_cost,
        coalesce((select sum(downtime_minutes) from breakdowns where reported_at >= date_trunc('month', current_date)),0) as month_downtime,
        (select count(*)::int from inspections where status = 'scheduled' and scheduled_at::date <= current_date) as pending_inspections,
        round((
          select case when count(*) = 0 then 100 else
            100.0 * count(*) filter (where status = 'completed' and (actual_date is null or actual_date <= scheduled_date)) / count(*)
          end
          from pm_records where scheduled_date >= date_trunc('month', current_date) - interval '2 months'
        )::numeric, 1)::float as pm_compliance,
        round((
          select case when count(*) = 0 then 100 else
            100.0 * (1.0 - (coalesce(sum(total_downtime_minutes),0)::float / nullif(count(*) * 30 * 24 * 60,0)))
          end
          from assets where deleted_at is null
        )::numeric, 1)::float as availability,
        (select coalesce(sum((readings->>'kwh')::float),0) from utility_readings where utility_type = 'electricity' and recorded_on >= date_trunc('month', current_date)) as energy_kwh,
        (select coalesce(sum((readings->>'kl')::float),0) from utility_readings where utility_type = 'water' and recorded_on >= date_trunc('month', current_date)) as water_kl
    `);

    const [breakdownTrend, complaintsByDept, assetBreakdowns, energy, water, technicians, duePm, openCritical, expiring] =
      await Promise.all([
        sql.query<{ day: string; count: number }>(`
          select to_char(d::date,'DD Mon') as day, count(b.id)::int as count
          from generate_series(current_date - 13, current_date, interval '1 day') d
          left join breakdowns b on b.reported_at::date = d::date
          group by d order by d
        `),
        sql.query<{ name: string; count: number }>(`
          select coalesce(d.name,'Unassigned') as name, count(*)::int as count
          from breakdowns b left join departments d on d.id = b.department_id
          where b.reported_at >= now() - interval '60 days'
          group by 1 order by 2 desc limit 8
        `),
        sql.query<{ name: string; count: number }>(`
          select coalesce(a.asset_code, 'Non-asset') as name, count(*)::int as count
          from breakdowns b left join assets a on a.id = b.asset_id
          group by 1 order by 2 desc limit 8
        `),
        sql.query<{ day: string; kwh: number }>(`
          select to_char(recorded_on,'DD Mon') as day, coalesce((readings->>'kwh')::float,0) as kwh
          from utility_readings where utility_type = 'electricity' and recorded_on >= current_date - 13
          order by recorded_on
        `),
        sql.query<{ day: string; kl: number }>(`
          select to_char(recorded_on,'DD Mon') as day, coalesce((readings->>'kl')::float,0) as kl
          from utility_readings where utility_type = 'water' and recorded_on >= current_date - 13
          order by recorded_on
        `),
        sql.query<{ name: string; open: number; completed: number }>(`
          select s.name,
            count(*) filter (where w.status not in ('closed','cancelled','verified','completed'))::int as open,
            count(*) filter (where w.status in ('closed','completed','verified'))::int as completed
          from staff s
          left join work_orders w on w.technician_id = s.id
          where s.role in ('technician','maintenance_engineer','electrical_engineer','hvac_engineer','biomedical_engineer')
          group by s.id, s.name order by open desc, s.name limit 8
        `),
        sql.query(`
          select p.id, p.pm_number, p.scheduled_date, p.status, a.asset_code, a.name as asset_name, s.name as technician_name
          from pm_records p
          join assets a on a.id = p.asset_id
          left join staff s on s.id = p.technician_id
          where p.status not in ('completed','cancelled')
          order by p.scheduled_date asc limit 8
        `),
        sql.query(`
          select b.id, b.ticket_number, b.priority, b.status, b.description, a.asset_code, a.name as asset_name, l.name as location_name
          from breakdowns b
          left join assets a on a.id = b.asset_id
          left join locations l on l.id = b.location_id
          where b.status not in ('closed','cancelled') and (b.priority in ('critical','high') or b.criticality = 'critical')
          order by b.reported_at desc limit 8
        `),
        sql.query(`
          select 'contract' as kind, contract_number as label, end_date as due, contract_type as extra from contracts
          where end_date <= current_date + 30
          union all
          select 'calibration', a.asset_code, c.due_date, c.agency from calibrations c join assets a on a.id = c.asset_id
          where c.due_date <= current_date + 30
          order by due asc limit 10
        `),
      ]);

    const completedPm = Number(kpis[0]?.completed_pm ?? 0);
    const overduePm = Number(kpis[0]?.overdue_pm ?? 0);
    const pendingPm = Number(kpis[0]?.pending_pm ?? 0);

    return freeze({
      kpis: Object.fromEntries(Object.entries(kpis[0] ?? {}).map(([k, v]) => [k, Number(v) || 0])),
      breakdownTrend,
      pmCompliance: [
        { name: "Completed", value: completedPm },
        { name: "Pending", value: pendingPm },
        { name: "Overdue", value: overduePm },
      ],
      complaintsByDept,
      assetBreakdowns,
      energy,
      water,
      technicians,
      costs: [
        { month: "Jul", maintenance: 186000, spares: 42000 },
        { month: "Aug", maintenance: 142000, spares: 38000 },
        { month: "Sep", maintenance: Number(kpis[0]?.month_cost ?? 0), spares: 54000 },
      ],
      openCritical,
      duePm,
      expiring,
    });
  });

export const searchGlobal = createServerFn({ method: "GET" })
  .validator((d: { q?: string }) => ({ q: (d?.q ?? "").trim() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ctx(context.userId);
    const sql = await db();
    const q = `%${data.q}%`;
    if (data.q.length < 2) return freeze({ assets: [], breakdowns: [], workOrders: [], staff: [], vendors: [] });
    const [assets, breakdowns, workOrders, staff, vendors] = await Promise.all([
      sql.query(`select id, asset_code, name, status from assets where deleted_at is null and (asset_code ilike $1 or name ilike $1 or serial_number ilike $1) limit 8`, [q]),
      sql.query(`select id, ticket_number, description, status from breakdowns where ticket_number ilike $1 or description ilike $1 limit 8`, [q]),
      sql.query(`select id, wo_number, problem, status from work_orders where wo_number ilike $1 or problem ilike $1 limit 8`, [q]),
      sql.query(`select id, name, role, email from staff where deleted_at is null and (name ilike $1 or email ilike $1) limit 8`, [q]),
      sql.query(`select id, name, service_category from vendors where deleted_at is null and name ilike $1 limit 8`, [q]),
    ]);
    return freeze({ assets, breakdowns, workOrders, staff, vendors });
  });

const assetSelect = `
  select a.*, c.name as category_name, c.kind as category_kind, d.name as department_name,
    l.name as location_name, v.name as vendor_name, s.name as responsible_name
  from assets a
  left join asset_categories c on c.id = a.category_id
  left join departments d on d.id = a.department_id
  left join locations l on l.id = a.location_id
  left join vendors v on v.id = a.vendor_id
  left join staff s on s.id = a.responsible_staff_id
`;

export const listAssets = createServerFn({ method: "GET" })
  .validator((d?: { q?: string; category?: string; status?: string; department?: string; criticality?: string }) => d ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    const filters: Array<[string, ...unknown[]] | string> = [];
    if (data.q) {
      const q = `%${data.q}%`;
      filters.push(["(a.asset_code ilike ? or a.name ilike ? or a.serial_number ilike ? or a.model ilike ?)", q, q, q, q]);
    }
    if (data.category) filters.push(["a.category_id = ?", data.category]);
    if (data.status) filters.push(["a.status = ?", data.status]);
    if (data.department) filters.push(["a.department_id = ?", data.department]);
    if (data.criticality) filters.push(["a.criticality = ?", data.criticality]);
    filters.push("a.deleted_at is null");
    const w = where(filters);
    const rows = await sql.query(`${assetSelect} where ${w.sql} order by a.asset_code`, w.params);
    return freeze(rows);
  });

export const getAsset = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ctx(context.userId);
    const sql = await db();
    const assets = await sql.query(`${assetSelect} where (a.id = $1 or a.asset_code = $1) and a.deleted_at is null limit 1`, [data.id]);
    if (!assets[0]) return null;
    const id = assets[0].id as string;
    const [breakdowns, pm, workOrders, calibrations, contracts, documents, logs] = await Promise.all([
      sql.query(`select * from breakdowns where asset_id = $1 order by reported_at desc limit 20`, [id]),
      sql.query(`select * from pm_records where asset_id = $1 order by scheduled_date desc limit 20`, [id]),
      sql.query(`select * from work_orders where asset_id = $1 order by created_at desc limit 12`, [id]),
      sql.query(`select * from calibrations where asset_id = $1 order by due_date desc`, [id]),
      sql.query(`select c.*, v.name as vendor_name from contracts c join vendors v on v.id = c.vendor_id where c.asset_id = $1 order by c.end_date desc`, [id]),
      sql.query(`select * from documents where linked_type = 'asset' and linked_id = $1 order by uploaded_at desc`, [id]),
      sql.query(`select * from audit_logs where entity_type in ('asset','breakdown') and (entity_id = $1 or previous_value->>'asset_id' = $1) order by created_at desc limit 20`, [id]),
    ]);
    return freeze({ asset: assets[0], breakdowns, pm, workOrders, calibrations, contracts, documents, logs });
  });

export const saveAsset = createServerFn({ method: "POST" })
  .validator((d: Record<string, unknown>) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff, userId } = await ctx(context.userId);
    if (!can(staff.effective_role, "assets.write")) throw new Error("Forbidden");
    const id = String(data.id || data.asset_code || nid("ast"));
    const existing = await sql.query(`select * from assets where id = $1`, [id]);
    const fields = [
      "id", "asset_code", "name", "category_id", "sub_category", "department_id", "location_id", "room",
      "manufacturer", "model", "serial_number", "installation_date", "purchase_date", "purchase_cost",
      "warranty_months", "warranty_expiry", "vendor_id", "criticality", "risk_level", "status",
      "responsible_staff_id", "maintenance_frequency", "calibration_required", "next_maintenance", "notes",
    ];
    const row: Record<string, unknown> = { id };
    for (const f of fields) if (f in data) row[f] = data[f] ?? null;
    if (!row.asset_code) row.asset_code = String(id);
    if (!existing[0]) {
      await sql.query(
        `insert into assets (id, asset_code, name, category_id, status) values ($1,$2,$3,$4,'operational')`,
        [id, row.asset_code, row.name ?? "New asset", row.category_id ?? "cat-med"],
      );
    }
    await sql.query(
      `update assets set
        asset_code=coalesce($2,asset_code), name=coalesce($3,name), category_id=coalesce($4,category_id),
        sub_category=$5, department_id=$6, location_id=$7, room=$8, manufacturer=$9, model=$10, serial_number=$11,
        installation_date=$12, purchase_date=$13, purchase_cost=$14, warranty_months=$15, warranty_expiry=$16,
        vendor_id=$17, criticality=coalesce($18,criticality), risk_level=coalesce($19,risk_level),
        status=coalesce($20,status), responsible_staff_id=$21, maintenance_frequency=$22,
        calibration_required=coalesce($23,calibration_required), next_maintenance=$24, notes=$25, updated_at=now()
       where id=$1`,
      [
        id, row.asset_code, row.name, row.category_id, row.sub_category, row.department_id, row.location_id, row.room,
        row.manufacturer, row.model, row.serial_number, row.installation_date, row.purchase_date, row.purchase_cost,
        row.warranty_months, row.warranty_expiry, row.vendor_id, row.criticality, row.risk_level, row.status,
        row.responsible_staff_id, row.maintenance_frequency, row.calibration_required ?? false, row.next_maintenance, row.notes,
      ],
    );
    await audit(sql, staff, userId, existing[0] ? "update" : "create", "asset", id, existing[0], row);
    return { id };
  });

const bdSelect = `
  select b.*, a.name as asset_name, a.asset_code, d.name as department_name, l.name as location_name,
    rb.name as reporter_name, en.name as engineer_name, te.name as technician_name, v.name as vendor_name
  from breakdowns b
  left join assets a on a.id = b.asset_id
  left join departments d on d.id = b.department_id
  left join locations l on l.id = b.location_id
  left join staff rb on rb.id = b.reported_by_staff_id
  left join staff en on en.id = b.assigned_engineer_id
  left join staff te on te.id = b.assigned_technician_id
  left join vendors v on v.id = b.vendor_id
`;

export const listBreakdowns = createServerFn({ method: "GET" })
  .validator((d?: { q?: string; status?: string; priority?: string; department?: string }) => d ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    const filters: Array<[string, ...unknown[]] | string> = [];
    if (data.q) {
      const q = `%${data.q}%`;
      filters.push(["(b.ticket_number ilike ? or b.description ilike ? or a.asset_code ilike ?)", q, q, q]);
    }
    if (data.status) filters.push(["b.status = ?", data.status]);
    if (data.priority) filters.push(["b.priority = ?", data.priority]);
    if (data.department) filters.push(["b.department_id = ?", data.department]);
    if (staff.effective_role === "vendor" && staff.vendor_id) filters.push(["b.vendor_id = ?", staff.vendor_id]);
    if (staff.effective_role === "technician") {
      filters.push(["(b.assigned_technician_id = ? or b.assigned_engineer_id = ?)", staff.id, staff.id]);
    }
    if (staff.effective_role === "department_user") {
      filters.push(["(b.reported_by_staff_id = ? or b.department_id = ?)", staff.id, staff.department_id]);
    }
    const w = where(filters);
    const rows = await sql.query(`${bdSelect} where ${w.sql} order by b.reported_at desc`, w.params);
    return freeze(rows);
  });

export const getBreakdown = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`${bdSelect} where b.id = $1 or b.ticket_number = $1`, [data.id]);
    if (!rows[0]) return null;
    const spares = await sql.query(
      `select bs.*, s.name as spare_name, s.part_number from breakdown_spares bs join spares s on s.id = bs.spare_id where bs.breakdown_id = $1`,
      [rows[0].id],
    );
    const rca = await sql.query(`select * from rca where breakdown_id = $1`, [rows[0].id]);
    return freeze({ ticket: rows[0], spares, rca: rca[0] ?? null });
  });

export const createBreakdown = createServerFn({ method: "POST" })
  .validator((d: {
    asset_id?: string | null;
    department_id?: string | null;
    location_id?: string | null;
    category: string;
    description: string;
    priority?: string;
    criticality?: string;
    photo_data?: string | null;
  }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff, userId } = await ctx(context.userId);
    if (!can(staff.effective_role, "breakdowns.write")) throw new Error("Forbidden");
    const id = nid("bd");
    const ticket = await nextNumber(sql, "breakdowns", "ticket_number", "BD");
    let department = data.department_id ?? staff.department_id;
    let location = data.location_id ?? null;
    if (data.asset_id) {
      const a = await sql.query<{ department_id: string; location_id: string; responsible_staff_id: string; name: string; asset_code: string }>(
        "select department_id, location_id, responsible_staff_id, name, asset_code from assets where id = $1",
        [data.asset_id],
      );
      if (a[0]) {
        department = department || a[0].department_id;
        location = location || a[0].location_id;
      }
    }
    const priority = data.priority ?? "medium";
    await sql.query(
      `insert into breakdowns (id, ticket_number, reported_by_staff_id, department_id, location_id, asset_id, category, description, photo_data, priority, criticality, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'open')`,
      [id, ticket, staff.id, department, location, data.asset_id ?? null, data.category, data.description, data.photo_data ?? null, priority, data.criticality ?? priority],
    );
    if (data.asset_id) {
      await sql.query(
        `update assets set last_breakdown = current_date, total_breakdown_count = total_breakdown_count + 1, status = case when $2 in ('critical','high') then 'down' else status end, updated_at = now() where id = $1`,
        [data.asset_id, priority],
      );
    }
    await audit(sql, staff, userId, "create", "breakdown", id, null, { ticket, description: data.description });
    await notify(sql, "stf-kavitha", priority === "critical" ? "critical_breakdown" : "new_breakdown", `${ticket}: ${priority} breakdown`, data.description.slice(0, 180), "breakdown", id);
    return { id, ticket_number: ticket };
  });

export const updateBreakdown = createServerFn({ method: "POST" })
  .validator((d: Record<string, unknown> & { id: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff, userId } = await ctx(context.userId);
    if (!can(staff.effective_role, "breakdowns.write")) throw new Error("Forbidden");
    const prev = await sql.query<Record<string, unknown>>("select * from breakdowns where id = $1", [data.id]);
    if (!prev[0]) throw new Error("Not found");
    const p = prev[0];
    const status = String(data.status ?? p.status);
    const now = new Date().toISOString();
    let responded_at = p.responded_at;
    let start_time = p.start_time;
    let repair_start = p.repair_start;
    let completion_time = p.completion_time;
    if (!responded_at && data.assigned_technician_id) responded_at = now;
    if (!start_time && (status === "assigned" || data.assigned_technician_id)) start_time = now;
    if (!repair_start && status === "in_progress") repair_start = now;
    if (!completion_time && ["resolved", "verified", "closed"].includes(status)) completion_time = now;
    const response_minutes = minutesBetween(p.reported_at as string, responded_at as string) ?? p.response_minutes;
    const resolution_minutes = minutesBetween(p.reported_at as string, completion_time as string) ?? p.resolution_minutes;
    const downtime_minutes = minutesBetween(p.reported_at as string, completion_time as string) ?? p.downtime_minutes;
    await sql.query(
      `update breakdowns set
        status=$2, assigned_engineer_id=coalesce($3, assigned_engineer_id), assigned_technician_id=coalesce($4, assigned_technician_id),
        vendor_id=coalesce($5, vendor_id), start_time=$6, responded_at=$7, repair_start=$8, completion_time=$9,
        downtime_minutes=$10, response_minutes=$11, resolution_minutes=$12, root_cause=coalesce($13, root_cause),
        corrective_action=coalesce($14, corrective_action), external_service=coalesce($15, external_service),
        cost=coalesce($16, cost), remarks=coalesce($17, remarks),
        closure_approved_by=$18, updated_at=now()
       where id=$1`,
      [
        data.id, status, data.assigned_engineer_id ?? null, data.assigned_technician_id ?? null, data.vendor_id ?? null,
        start_time, responded_at, repair_start, completion_time, downtime_minutes, response_minutes, resolution_minutes,
        data.root_cause ?? null, data.corrective_action ?? null, data.external_service ?? null, data.cost ?? null,
        data.remarks ?? null, status === "closed" ? staff.id : p.closure_approved_by,
      ],
    );
    if (status === "closed" && p.asset_id) {
      await sql.query(
        `update assets set total_downtime_minutes = total_downtime_minutes + coalesce($2,0),
          maintenance_cost = maintenance_cost + coalesce($3,0),
          status = 'operational', updated_at = now() where id = $1`,
        [p.asset_id, downtime_minutes ?? 0, data.cost ?? p.cost ?? 0],
      );
    }
    if (Array.isArray(data.spares)) {
      await sql.query("delete from breakdown_spares where breakdown_id = $1", [data.id]);
      for (const sp of data.spares as Array<{ spare_id: string; qty: number; unit_cost?: number }>) {
        await sql.query(
          `insert into breakdown_spares (id, breakdown_id, spare_id, qty, unit_cost) values ($1,$2,$3,$4,$5)`,
          [nid("bs"), data.id, sp.spare_id, sp.qty, sp.unit_cost ?? 0],
        );
        await sql.query(
          `update spares set current_stock = current_stock - $2 where id = $1`,
          [sp.spare_id, sp.qty],
        );
        await sql.query(
          `insert into stock_movements (id, spare_id, movement_type, qty, ref_type, ref_id, staff_id, unit_cost)
           values ($1,$2,'issue',$3,'breakdown',$4,$5,$6)`,
          [nid("sm"), sp.spare_id, sp.qty, data.id, staff.id, sp.unit_cost ?? 0],
        );
      }
    }
    await audit(sql, staff, userId, "update", "breakdown", data.id, { status: p.status }, { status });
    if (data.assigned_technician_id) {
      await notify(sql, String(data.assigned_technician_id), "assigned_task", `Assigned ${p.ticket_number}`, String(p.description).slice(0, 160), "breakdown", data.id);
    }
    return { ok: true };
  });

const woSelect = `
  select w.*, a.name as asset_name, a.asset_code, d.name as department_name, l.name as location_name,
    rq.name as requester_name, te.name as technician_name, v.name as vendor_name
  from work_orders w
  left join assets a on a.id = w.asset_id
  left join departments d on d.id = w.department_id
  left join locations l on l.id = w.location_id
  left join staff rq on rq.id = w.requester_id
  left join staff te on te.id = w.technician_id
  left join vendors v on v.id = w.vendor_id
`;

export const listWorkOrders = createServerFn({ method: "GET" })
  .validator((d?: { status?: string; mine?: boolean; q?: string }) => d ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    const filters: Array<[string, ...unknown[]] | string> = [];
    if (data.q) {
      const q = `%${data.q}%`;
      filters.push(["(w.wo_number ilike ? or w.problem ilike ?)", q, q]);
    }
    if (data.status) filters.push(["w.status = ?", data.status]);
    if (data.mine || staff.effective_role === "technician") filters.push(["w.technician_id = ?", staff.id]);
    if (staff.effective_role === "vendor" && staff.vendor_id) filters.push(["w.vendor_id = ?", staff.vendor_id]);
    const w = where(filters);
    const rows = await sql.query(`${woSelect} where ${w.sql} order by w.created_at desc`, w.params);
    return freeze(rows);
  });

export const getWorkOrder = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`${woSelect} where w.id = $1 or w.wo_number = $1`, [data.id]);
    if (!rows[0]) return null;
    const spares = await sql.query(
      `select ws.*, s.name as spare_name from work_order_spares ws join spares s on s.id = ws.spare_id where ws.work_order_id = $1`,
      [rows[0].id],
    );
    return freeze({ wo: rows[0], spares });
  });

export const saveWorkOrder = createServerFn({ method: "POST" })
  .validator((d: Record<string, unknown>) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff, userId } = await ctx(context.userId);
    if (!can(staff.effective_role, "work_orders.write")) throw new Error("Forbidden");
    let id = String(data.id || "");
    if (!id) {
      id = nid("wo");
      const wo_number = await nextNumber(sql, "work_orders", "wo_number", "WO");
      await sql.query(
        `insert into work_orders (id, wo_number, requester_id, department_id, asset_id, location_id, problem, priority, status, technician_id, vendor_id, planned_date, remarks, source_type)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          id, wo_number, staff.id, data.department_id ?? staff.department_id, data.asset_id ?? null, data.location_id ?? null,
          data.problem, data.priority ?? "medium", data.status ?? "requested", data.technician_id ?? null, data.vendor_id ?? null,
          data.planned_date ?? null, data.remarks ?? null, data.source_type ?? "request",
        ],
      );
      await notify(sql, "stf-kavitha", "open_complaint", `New work order ${wo_number}`, String(data.problem).slice(0, 160), "work_order", id);
      await audit(sql, staff, userId, "create", "work_order", id, null, { wo_number });
      return { id, wo_number };
    }
    const prev = await sql.query<Record<string, unknown>>("select * from work_orders where id = $1", [id]);
    const status = String(data.status ?? prev[0]?.status);
    const actual_start = data.actual_start ?? (status === "in_progress" && !prev[0]?.actual_start ? new Date().toISOString() : prev[0]?.actual_start);
    const actual_completion = ["completed", "verified", "closed"].includes(status) ? (prev[0]?.actual_completion ?? new Date().toISOString()) : prev[0]?.actual_completion;
    await sql.query(
      `update work_orders set status=$2, technician_id=coalesce($3,technician_id), vendor_id=coalesce($4,vendor_id),
        planned_date=coalesce($5,planned_date), actual_start=$6, actual_completion=$7, labour_hours=coalesce($8,labour_hours),
        cost=coalesce($9,cost), remarks=coalesce($10,remarks), updated_at=now() where id=$1`,
      [id, status, data.technician_id ?? null, data.vendor_id ?? null, data.planned_date ?? null, actual_start, actual_completion, data.labour_hours ?? null, data.cost ?? null, data.remarks ?? null],
    );
    await audit(sql, staff, userId, "update", "work_order", id, { status: prev[0]?.status }, { status });
    return { id };
  });

export const listPm = createServerFn({ method: "GET" })
  .validator((d?: { status?: string; mine?: boolean }) => d ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    const filters: Array<[string, ...unknown[]] | string> = [];
    if (data.status === "overdue") {
      filters.push("(p.status in ('overdue','missed') or (p.status in ('scheduled','due') and p.scheduled_date < current_date))");
    } else if (data.status === "due") {
      filters.push("p.scheduled_date = current_date and p.status not in ('completed','cancelled')");
    } else if (data.status === "upcoming") {
      filters.push("p.scheduled_date > current_date and p.status = 'scheduled'");
    } else if (data.status) {
      filters.push(["p.status = ?", data.status]);
    }
    if (data.mine || staff.effective_role === "technician") filters.push(["p.technician_id = ?", staff.id]);
    const w = where(filters);
    const rows = await sql.query(
      `select p.*, a.name as asset_name, a.asset_code, a.location_id, l.name as location_name, s.name as technician_name,
        case
          when p.status = 'completed' then 'completed'
          when p.scheduled_date < current_date and p.status not in ('completed','cancelled') then 'overdue'
          when p.scheduled_date = current_date and p.status not in ('completed','cancelled') then 'due'
          else p.status
        end as pm_state
       from pm_records p
       join assets a on a.id = p.asset_id
       left join locations l on l.id = a.location_id
       left join staff s on s.id = p.technician_id
       where ${w.sql}
       order by p.scheduled_date asc`,
      w.params,
    );
    return freeze(rows);
  });

export const completePm = createServerFn({ method: "POST" })
  .validator((d: {
    id: string;
    observations?: string;
    remarks?: string;
    parts_replaced?: string;
    lubrication?: boolean;
    cleaning?: boolean;
    testing?: boolean;
    calibration?: boolean;
    safety_checks?: boolean;
    readings?: Record<string, unknown>;
    cost?: number;
  }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff, userId } = await ctx(context.userId);
    if (!can(staff.effective_role, "pm.write")) throw new Error("Forbidden");
    await sql.query(
      `update pm_records set status='completed', actual_date=current_date, observations=$2, remarks=$3, parts_replaced=$4,
        lubrication=$5, cleaning=$6, testing=$7, calibration=$8, safety_checks=$9, readings=$10::jsonb, cost=coalesce($11,cost),
        supervisor_id=$12, updated_at=now() where id=$1`,
      [
        data.id, data.observations ?? null, data.remarks ?? null, data.parts_replaced ?? null,
        data.lubrication ?? false, data.cleaning ?? true, data.testing ?? true, data.calibration ?? false,
        data.safety_checks ?? true, JSON.stringify(data.readings ?? {}), data.cost ?? 0, staff.id,
      ],
    );
    const rec = await sql.query<{ asset_id: string; scheduled_date: string }>("select asset_id, scheduled_date from pm_records where id = $1", [data.id]);
    if (rec[0]) {
      await sql.query("update assets set last_maintenance = current_date, updated_at = now() where id = $1", [rec[0].asset_id]);
    }
    await audit(sql, staff, userId, "complete", "pm", data.id, null, { status: "completed" });
    return { ok: true };
  });

export const listLogbooks = createServerFn({ method: "GET" })
  .validator((d?: { type?: string }) => d ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = data.type
      ? await sql.query(
          `select e.*, a.asset_code, a.name as asset_name, s.name as recorder_name
           from logbook_entries e
           left join assets a on a.id = e.asset_id
           left join staff s on s.id = e.recorded_by
           where e.logbook_type = $1 order by e.recorded_at desc limit 80`,
          [data.type],
        )
      : await sql.query(
          `select e.*, a.asset_code, a.name as asset_name, s.name as recorder_name
           from logbook_entries e
           left join assets a on a.id = e.asset_id
           left join staff s on s.id = e.recorded_by
           order by e.recorded_at desc limit 80`,
        );
    return freeze(rows);
  });

export const addLogbook = createServerFn({ method: "POST" })
  .validator((d: { logbook_type: string; asset_id?: string | null; location_id?: string | null; readings: Record<string, unknown>; remarks?: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    if (!can(staff.effective_role, "logbooks.write")) throw new Error("Forbidden");
    const id = nid("lb");
    await sql.query(
      `insert into logbook_entries (id, logbook_type, asset_id, location_id, recorded_by, readings, remarks)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
      [id, data.logbook_type, data.asset_id ?? null, data.location_id ?? null, staff.id, JSON.stringify(data.readings), data.remarks ?? null],
    );
    return { id };
  });

export const listInspections = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select i.*, s.name as inspector_name, c.name as checklist_name
      from inspections i
      left join staff s on s.id = i.inspector_id
      left join checklists c on c.id = i.checklist_id
      order by coalesce(i.scheduled_at, i.created_at) desc
    `);
    return freeze(rows);
  });

export const getInspection = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ctx(context.userId);
    const sql = await db();
    const ins = await sql.query(`select i.*, s.name as inspector_name from inspections i left join staff s on s.id = i.inspector_id where i.id = $1`, [data.id]);
    if (!ins[0]) return null;
    const items = await sql.query(`select * from checklist_items where checklist_id = $1 order by sort_order`, [ins[0].checklist_id]);
    const results = await sql.query(`select * from inspection_results where inspection_id = $1`, [data.id]);
    return freeze({ inspection: ins[0], items, results });
  });

export const submitInspection = createServerFn({ method: "POST" })
  .validator((d: {
    id: string;
    notes?: string;
    results: Array<{ item_id?: string; label: string; result: string; observation?: string }>;
  }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff, userId } = await ctx(context.userId);
    if (!can(staff.effective_role, "inspections.write")) throw new Error("Forbidden");
    await sql.query("delete from inspection_results where inspection_id = $1", [data.id]);
    let fails = 0;
    let ticketId: string | null = null;
    for (const r of data.results) {
      let tid: string | null = null;
      if (r.result === "fail") {
        fails += 1;
        const created = await createBreakdown({
          data: {
            category: "other",
            description: `Inspection fail: ${r.label}${r.observation ? ` — ${r.observation}` : ""}`,
            priority: "high",
          },
        });
        tid = created.id;
        ticketId = created.id;
      }
      await sql.query(
        `insert into inspection_results (id, inspection_id, item_id, label, result, observation, ticket_id) values ($1,$2,$3,$4,$5,$6,$7)`,
        [nid("ir"), data.id, r.item_id ?? null, r.label, r.result, r.observation ?? null, tid],
      );
    }
    const score = data.results.length ? Math.round((100 * (data.results.length - fails)) / data.results.length) : 100;
    await sql.query(
      `update inspections set status='completed', completed_at=now(), score=$2, notes=$3, inspector_id=$4 where id=$1`,
      [data.id, score, data.notes ?? null, staff.id],
    );
    await audit(sql, staff, userId, "complete", "inspection", data.id, null, { score, fails });
    return { score, ticketId };
  });

export const listUtilities = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select * from utility_readings order by recorded_on desc, utility_type limit 120
    `);
    return freeze(rows);
  });

export const addUtility = createServerFn({ method: "POST" })
  .validator((d: { utility_type: string; recorded_on: string; readings: Record<string, unknown>; cost?: number }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    const id = nid("ut");
    await sql.query(
      `insert into utility_readings (id, utility_type, recorded_on, readings, cost, recorded_by)
       values ($1,$2,$3,$4::jsonb,$5,$6)
       on conflict (utility_type, recorded_on) do update set readings = excluded.readings, cost = excluded.cost`,
      [id, data.utility_type, data.recorded_on, JSON.stringify(data.readings), data.cost ?? null, staff.id],
    );
    return { ok: true };
  });

export const listInventory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const spares = await sql.query(`
      select s.*, v.name as supplier_name, a.asset_code as compatible_code
      from spares s
      left join vendors v on v.id = s.supplier_id
      left join assets a on a.id = s.compatible_asset_id
      order by s.name
    `);
    const movements = await sql.query(`
      select m.*, s.name as spare_name, st.name as staff_name
      from stock_movements m
      join spares s on s.id = m.spare_id
      left join staff st on st.id = m.staff_id
      order by m.created_at desc limit 40
    `);
    return freeze({ spares, movements });
  });

export const moveStock = createServerFn({ method: "POST" })
  .validator((d: { spare_id: string; movement_type: string; qty: number; notes?: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    if (!can(staff.effective_role, "inventory.write")) throw new Error("Forbidden");
    const delta = data.movement_type === "issue" ? -Math.abs(data.qty) : Math.abs(data.qty);
    await sql.query(`update spares set current_stock = current_stock + $2 where id = $1`, [data.spare_id, delta]);
    await sql.query(
      `insert into stock_movements (id, spare_id, movement_type, qty, staff_id, notes) values ($1,$2,$3,$4,$5,$6)`,
      [nid("sm"), data.spare_id, data.movement_type, Math.abs(data.qty), staff.id, data.notes ?? null],
    );
    const row = await sql.query<{ current_stock: number; min_stock: number; name: string }>("select current_stock, min_stock, name from spares where id=$1", [data.spare_id]);
    if (row[0] && row[0].current_stock <= row[0].min_stock) {
      await notify(sql, "stf-kavitha", "low_stock", `Low stock: ${row[0].name}`, `Now ${row[0].current_stock} (min ${row[0].min_stock})`, "spare", data.spare_id);
    }
    return { ok: true };
  });

export const listVendors = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select v.*,
        (select count(*) from contracts c where c.vendor_id = v.id) as contract_count,
        (select count(*) from breakdowns b where b.vendor_id = v.id) as breakdown_count,
        (select coalesce(avg(response_minutes),0) from breakdowns b where b.vendor_id = v.id and b.response_minutes is not null) as avg_response
      from vendors v where v.deleted_at is null order by v.name
    `);
    return freeze(rows);
  });

export const listContracts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select c.*, v.name as vendor_name, a.asset_code, a.name as asset_name,
        (c.end_date - current_date) as days_left
      from contracts c
      join vendors v on v.id = c.vendor_id
      left join assets a on a.id = c.asset_id
      order by c.end_date asc
    `);
    return freeze(rows);
  });

export const listCalibrations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select c.*, a.asset_code, a.name as asset_name, a.department_id, d.name as department_name
      from calibrations c
      join assets a on a.id = c.asset_id
      left join departments d on d.id = a.department_id
      order by c.due_date asc
    `);
    return freeze(rows);
  });

export const saveCalibration = createServerFn({ method: "POST" })
  .validator((d: { asset_id: string; standard_name?: string; calibration_date: string; due_date: string; certificate_number?: string; agency?: string; result?: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    if (!can(staff.effective_role, "calibration.write")) throw new Error("Forbidden");
    await sql.query(
      `insert into calibrations (id, asset_id, standard_name, calibration_date, due_date, certificate_number, agency, result, next_due)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$5)`,
      [nid("cal"), data.asset_id, data.standard_name ?? null, data.calibration_date, data.due_date, data.certificate_number ?? null, data.agency ?? null, data.result ?? "pass"],
    );
    return { ok: true };
  });

export const listHousekeeping = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select h.*, s.name as assignee_name, l.name as location_name
      from housekeeping_tasks h
      left join staff s on s.id = h.assigned_to
      left join locations l on l.id = h.location_id
      order by h.scheduled_date desc, h.area
    `);
    return freeze(rows);
  });

export const updateHousekeeping = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: string; score?: number; notes?: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    await sql.query(
      `update housekeeping_tasks set status=$2, score=coalesce($3,score), notes=coalesce($4,notes),
        completed_at = case when $2 in ('completed') then now() else completed_at end
       where id=$1`,
      [data.id, data.status, data.score ?? null, data.notes ?? null],
    );
    return { ok: true };
  });

export const listIncidents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select i.*, l.name as location_name, a.asset_code, s.name as reporter_name
      from incidents i
      left join locations l on l.id = i.location_id
      left join assets a on a.id = i.asset_id
      left join staff s on s.id = i.reported_by
      order by i.occurred_at desc
    `);
    return freeze(rows);
  });

export const saveIncident = createServerFn({ method: "POST" })
  .validator((d: Record<string, unknown>) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff, userId } = await ctx(context.userId);
    if (!can(staff.effective_role, "incidents.write")) throw new Error("Forbidden");
    if (!data.id) {
      const id = nid("inc");
      const num = await nextNumber(sql, "incidents", "incident_number", "INC");
      await sql.query(
        `insert into incidents (id, incident_number, incident_type, occurred_at, location_id, asset_id, description, people_involved, immediate_action, status, reported_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)`,
        [id, num, data.incident_type, data.occurred_at ?? new Date().toISOString(), data.location_id ?? null, data.asset_id ?? null, data.description, data.people_involved ?? null, data.immediate_action ?? null, staff.id],
      );
      await audit(sql, staff, userId, "create", "incident", id);
      return { id, incident_number: num };
    }
    await sql.query(
      `update incidents set status=coalesce($2,status), root_cause=coalesce($3,root_cause), corrective_action=coalesce($4,corrective_action),
        preventive_action=coalesce($5,preventive_action), closed_at = case when $2 = 'closed' then now() else closed_at end
       where id=$1`,
      [data.id, data.status ?? null, data.root_cause ?? null, data.corrective_action ?? null, data.preventive_action ?? null],
    );
    return { id: data.id };
  });

export const saveRca = createServerFn({ method: "POST" })
  .validator((d: {
    breakdown_id?: string;
    incident_id?: string;
    method: string;
    five_whys?: string[];
    root_cause: string;
    corrective_action?: string;
    preventive_action?: string;
    target_date?: string;
  }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    const id = nid("rca");
    await sql.query(
      `insert into rca (id, breakdown_id, incident_id, method, five_whys, root_cause, corrective_action, preventive_action, owner_id, target_date, status)
       values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,'open')`,
      [id, data.breakdown_id ?? null, data.incident_id ?? null, data.method, JSON.stringify(data.five_whys ?? []), data.root_cause, data.corrective_action ?? null, data.preventive_action ?? null, staff.id, data.target_date ?? null],
    );
    return { id };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select d.*, s.name as uploader_name from documents d
      left join staff s on s.id = d.uploaded_by
      order by d.uploaded_at desc
    `);
    return freeze(rows);
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql, staff } = await ctx(context.userId);
    const rows = await sql.query(
      `select * from notifications where staff_id = $1 order by created_at desc limit 40`,
      [staff.id],
    );
    return freeze(rows);
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .validator((d?: { id?: string }) => d ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff } = await ctx(context.userId);
    if (data.id) await sql.query(`update notifications set read_at = now() where id = $1 and staff_id = $2`, [data.id, staff.id]);
    else await sql.query(`update notifications set read_at = now() where staff_id = $1 and read_at is null`, [staff.id]);
    return { ok: true };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select a.*, s.name as staff_name from audit_logs a
      left join staff s on s.id = a.staff_id
      order by a.created_at desc limit 80
    `);
    return freeze(rows);
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const rows = await sql.query(`
      select s.*, d.name as department_name from staff s
      left join departments d on d.id = s.department_id
      where s.deleted_at is null order by s.name
    `);
    return freeze(rows);
  });

export const updateStaff = createServerFn({ method: "POST" })
  .validator((d: { id: string; role?: string; view_as_role?: string | null; department_id?: string | null; status?: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { sql, staff, userId } = await ctx(context.userId);
    if (data.view_as_role !== undefined && data.id === staff.id) {
      await sql.query(`update staff set view_as_role = $2, updated_at = now() where id = $1`, [staff.id, data.view_as_role]);
      return { ok: true };
    }
    if (!can(staff.effective_role, "staff.admin") && staff.effective_role !== "facility_manager") throw new Error("Forbidden");
    await sql.query(
      `update staff set role=coalesce($2,role), department_id=coalesce($3,department_id), status=coalesce($4,status), updated_at=now() where id=$1`,
      [data.id, data.role ?? null, data.department_id ?? null, data.status ?? null],
    );
    await audit(sql, staff, userId, "update", "staff", data.id, null, { role: data.role });
    return { ok: true };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const [breakdowns, pm, costs, downtime] = await Promise.all([
      sql.query(`select ticket_number, reported_at, status, priority, category, downtime_minutes, cost, description from breakdowns order by reported_at desc`),
      sql.query(`select pm_number, scheduled_date, actual_date, status, asset_id from pm_records order by scheduled_date desc`),
      sql.query(`select to_char(date_trunc('month', reported_at),'Mon YYYY') as month, sum(cost)::float as cost, sum(downtime_minutes)::int as downtime from breakdowns group by 1 order by min(reported_at)`),
      sql.query(`select a.asset_code, a.name, a.total_breakdown_count, a.total_downtime_minutes, a.maintenance_cost from assets a where a.total_breakdown_count > 0 order by a.total_breakdown_count desc`),
    ]);
    return freeze({ breakdowns, pm, costs, downtime });
  });

export const listSafety = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ctx(context.userId);
    const sql = await db();
    const equipment = await sql.query(`${assetSelect} where c.kind = 'fire_safety' and a.deleted_at is null order by a.asset_code`);
    const rounds = await sql.query(`select * from inspections where round_type = 'fire' order by scheduled_at desc`);
    return freeze({ equipment, rounds });
  });

export const getChecklistItems = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ctx(context.userId);
    const sql = await db();
    return freeze(await sql.query(`select * from checklist_items where checklist_id = $1 order by sort_order`, [data.id]));
  });
