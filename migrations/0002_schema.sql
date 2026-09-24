-- Sightline CMMS schema — Helios Eye Hospital operations

create table if not exists hospital_settings (
  id text primary key default 'default',
  name text not null,
  campus text,
  city text,
  beds integer,
  ot_count integer,
  timezone text not null default 'Asia/Kolkata',
  updated_at timestamptz not null default now()
);

create table if not exists departments (
  id text primary key,
  code text not null unique,
  name text not null,
  kind text not null default 'clinical',
  created_at timestamptz not null default now()
);

create table if not exists locations (
  id text primary key,
  code text not null unique,
  name text not null,
  building text,
  floor text,
  department_id text references departments(id),
  created_at timestamptz not null default now()
);

create table if not exists staff (
  id text primary key,
  user_id text unique,
  name text not null,
  email text not null,
  phone text,
  role text not null,
  view_as_role text,
  department_id text references departments(id),
  vendor_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists staff_email_idx on staff (email);
create index if not exists staff_role_idx on staff (role);

create table if not exists asset_categories (
  id text primary key,
  name text not null,
  parent_id text references asset_categories(id),
  kind text not null,
  sort_order integer not null default 0
);

create table if not exists vendors (
  id text primary key,
  name text not null,
  contact_person text,
  phone text,
  email text,
  service_category text,
  gstin text,
  license_no text,
  sla_hours integer,
  performance_score double precision,
  city text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists assets (
  id text primary key,
  asset_code text not null unique,
  name text not null,
  category_id text not null references asset_categories(id),
  sub_category text,
  department_id text references departments(id),
  location_id text references locations(id),
  room text,
  manufacturer text,
  model text,
  serial_number text,
  installation_date date,
  purchase_date date,
  purchase_cost double precision,
  warranty_months integer,
  warranty_expiry date,
  vendor_id text references vendors(id),
  criticality text not null default 'medium',
  risk_level text not null default 'medium',
  status text not null default 'operational',
  responsible_department_id text references departments(id),
  responsible_staff_id text references staff(id),
  maintenance_frequency text,
  calibration_required boolean not null default false,
  last_maintenance date,
  next_maintenance date,
  last_breakdown date,
  total_breakdown_count integer not null default 0,
  total_downtime_minutes integer not null default 0,
  maintenance_cost double precision not null default 0,
  spare_cost double precision not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists assets_category_idx on assets (category_id);
create index if not exists assets_status_idx on assets (status);
create index if not exists assets_dept_idx on assets (department_id);
create index if not exists assets_code_idx on assets (asset_code);

create table if not exists contracts (
  id text primary key,
  vendor_id text not null references vendors(id),
  contract_number text not null unique,
  asset_id text references assets(id),
  contract_type text not null,
  start_date date not null,
  end_date date not null,
  contract_value double precision,
  visits_included integer,
  pm_visits integer,
  breakdown_coverage boolean not null default true,
  response_hours integer,
  sla_text text,
  contact_person text,
  phone text,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists contracts_end_idx on contracts (end_date);

create table if not exists breakdowns (
  id text primary key,
  ticket_number text not null unique,
  reported_at timestamptz not null default now(),
  reported_by_staff_id text references staff(id),
  department_id text references departments(id),
  location_id text references locations(id),
  asset_id text references assets(id),
  category text not null,
  description text not null,
  photo_data text,
  priority text not null default 'medium',
  criticality text not null default 'medium',
  status text not null default 'open',
  assigned_engineer_id text references staff(id),
  assigned_technician_id text references staff(id),
  vendor_id text references vendors(id),
  start_time timestamptz,
  responded_at timestamptz,
  repair_start timestamptz,
  completion_time timestamptz,
  downtime_minutes integer,
  response_minutes integer,
  resolution_minutes integer,
  root_cause text,
  corrective_action text,
  external_service boolean not null default false,
  cost double precision not null default 0,
  remarks text,
  closure_approved_by text references staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists breakdowns_status_idx on breakdowns (status);
create index if not exists breakdowns_asset_idx on breakdowns (asset_id);
create index if not exists breakdowns_priority_idx on breakdowns (priority);

create table if not exists work_orders (
  id text primary key,
  wo_number text not null unique,
  requester_id text references staff(id),
  department_id text references departments(id),
  asset_id text references assets(id),
  location_id text references locations(id),
  problem text not null,
  priority text not null default 'medium',
  status text not null default 'requested',
  technician_id text references staff(id),
  vendor_id text references vendors(id),
  planned_date date,
  actual_start timestamptz,
  actual_completion timestamptz,
  labour_hours double precision,
  cost double precision not null default 0,
  remarks text,
  source_type text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_orders_status_idx on work_orders (status);
create index if not exists work_orders_tech_idx on work_orders (technician_id);

create table if not exists checklists (
  id text primary key,
  name text not null,
  kind text not null,
  department_id text references departments(id)
);

create table if not exists checklist_items (
  id text primary key,
  checklist_id text not null references checklists(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  require_reading boolean not null default false,
  unit text
);

create table if not exists pm_plans (
  id text primary key,
  asset_id text not null references assets(id),
  frequency text not null,
  checklist_id text references checklists(id),
  next_due date
);

create table if not exists pm_records (
  id text primary key,
  pm_number text not null unique,
  plan_id text references pm_plans(id),
  asset_id text not null references assets(id),
  checklist_id text references checklists(id),
  scheduled_date date not null,
  technician_id text references staff(id),
  actual_date date,
  status text not null default 'scheduled',
  readings jsonb,
  observations text,
  parts_replaced text,
  lubrication boolean,
  cleaning boolean,
  testing boolean,
  calibration boolean,
  safety_checks boolean,
  remarks text,
  supervisor_id text references staff(id),
  cost double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pm_records_status_idx on pm_records (status);
create index if not exists pm_records_date_idx on pm_records (scheduled_date);

create table if not exists inspections (
  id text primary key,
  round_type text not null,
  name text not null,
  checklist_id text references checklists(id),
  inspector_id text references staff(id),
  scheduled_at timestamptz,
  completed_at timestamptz,
  score integer,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists inspection_results (
  id text primary key,
  inspection_id text not null references inspections(id) on delete cascade,
  item_id text references checklist_items(id),
  label text not null,
  result text not null,
  observation text,
  corrective_action text,
  ticket_id text references breakdowns(id)
);

create table if not exists logbook_entries (
  id text primary key,
  logbook_type text not null,
  asset_id text references assets(id),
  location_id text references locations(id),
  recorded_by text references staff(id),
  recorded_at timestamptz not null default now(),
  readings jsonb not null default '{}'::jsonb,
  remarks text
);

create index if not exists logbook_type_idx on logbook_entries (logbook_type, recorded_at desc);

create table if not exists spares (
  id text primary key,
  name text not null,
  part_number text,
  category text,
  compatible_asset_id text references assets(id),
  min_stock integer not null default 0,
  max_stock integer not null default 0,
  current_stock integer not null default 0,
  location text,
  supplier_id text references vendors(id),
  unit_cost double precision,
  unit text not null default 'pcs',
  created_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id text primary key,
  spare_id text not null references spares(id),
  movement_type text not null,
  qty integer not null,
  ref_type text,
  ref_id text,
  staff_id text references staff(id),
  unit_cost double precision,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists breakdown_spares (
  id text primary key,
  breakdown_id text not null references breakdowns(id) on delete cascade,
  spare_id text not null references spares(id),
  qty integer not null,
  unit_cost double precision
);

create table if not exists work_order_spares (
  id text primary key,
  work_order_id text not null references work_orders(id) on delete cascade,
  spare_id text not null references spares(id),
  qty integer not null,
  unit_cost double precision
);

create table if not exists calibrations (
  id text primary key,
  asset_id text not null references assets(id),
  standard_name text,
  calibration_date date not null,
  due_date date not null,
  certificate_number text,
  agency text,
  result text,
  next_due date,
  created_at timestamptz not null default now()
);

create index if not exists calibrations_due_idx on calibrations (due_date);

create table if not exists utility_readings (
  id text primary key,
  utility_type text not null,
  recorded_on date not null,
  readings jsonb not null default '{}'::jsonb,
  cost double precision,
  recorded_by text references staff(id),
  created_at timestamptz not null default now()
);

create unique index if not exists utility_day_idx on utility_readings (utility_type, recorded_on);

create table if not exists housekeeping_tasks (
  id text primary key,
  area text not null,
  task_type text not null,
  location_id text references locations(id),
  scheduled_date date not null,
  assigned_to text references staff(id),
  status text not null default 'scheduled',
  score integer,
  notes text,
  completed_at timestamptz
);

create table if not exists incidents (
  id text primary key,
  incident_number text not null unique,
  incident_type text not null,
  occurred_at timestamptz not null,
  location_id text references locations(id),
  asset_id text references assets(id),
  description text not null,
  people_involved text,
  immediate_action text,
  root_cause text,
  corrective_action text,
  preventive_action text,
  status text not null default 'open',
  reported_by text references staff(id),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists rca (
  id text primary key,
  breakdown_id text references breakdowns(id),
  incident_id text references incidents(id),
  method text not null,
  five_whys jsonb,
  fishbone jsonb,
  root_cause text,
  corrective_action text,
  preventive_action text,
  owner_id text references staff(id),
  target_date date,
  evidence text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id text primary key,
  title text not null,
  kind text not null,
  linked_type text,
  linked_id text,
  notes text,
  uploaded_by text references staff(id),
  uploaded_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  staff_id text references staff(id),
  user_id text,
  kind text not null,
  title text not null,
  body text,
  ref_type text,
  ref_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_staff_idx on notifications (staff_id, created_at desc);

create table if not exists audit_logs (
  id text primary key,
  user_id text,
  staff_id text references staff(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_entity_idx on audit_logs (entity_type, entity_id);
