#!/usr/bin/env node
/** Generates migrations/0003_seed.sql for Helios Eye Hospital / Sightline. */
import { writeFileSync } from "node:fs";

const TODAY = "2026-09-22";

function sql(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "object") return sql(JSON.stringify(v));
  return `'${String(v).replace(/'/g, "''")}'`;
}

function ins(table, rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const values = rows
    .map((r) => `(${cols.map((c) => sql(r[c])).join(", ")})`)
    .join(",\n  ");
  return `insert into ${table} (${cols.join(", ")}) values\n  ${values};\n`;
}

function id(prefix, n) {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

function daysFrom(offset) {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function ts(offsetDays, hour = 9, minute = 0) {
  const d = new Date(`${TODAY}T00:00:00+05:30`);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const departments = [
  ["dept-ot", "OT", "Operation Theatre", "clinical"],
  ["dept-opd", "OPD", "Outpatient", "clinical"],
  ["dept-ipd", "IPD", "Inpatient Wards", "clinical"],
  ["dept-icu", "ICU", "Recovery / ICU", "clinical"],
  ["dept-img", "IMG", "Imaging & Diagnostics", "clinical"],
  ["dept-cssd", "CSSD", "Central Sterile Services", "clinical"],
  ["dept-pharm", "PHARM", "Pharmacy", "clinical"],
  ["dept-lab", "LAB", "Laboratory", "clinical"],
  ["dept-opt", "OPT", "Optical Shop", "clinical"],
  ["dept-eng", "ENG", "Engineering", "support"],
  ["dept-hk", "HK", "Housekeeping", "support"],
  ["dept-sec", "SEC", "Security & Safety", "support"],
  ["dept-admin", "ADM", "Administration", "support"],
  ["dept-bio", "BIO", "Biomedical", "support"],
].map(([id, code, name, kind]) => ({ id, code, name, kind }));

const locations = [
  ["loc-ot1", "OT-1", "Operation Theatre 1", "Main", "2", "dept-ot"],
  ["loc-ot2", "OT-2", "Operation Theatre 2", "Main", "2", "dept-ot"],
  ["loc-ot3", "OT-3", "Operation Theatre 3", "Main", "2", "dept-ot"],
  ["loc-laser", "LASER", "Laser Suite", "Main", "2", "dept-ot"],
  ["loc-rec", "REC", "Recovery Bay", "Main", "2", "dept-icu"],
  ["loc-opd1", "OPD-1", "OPD Consulting 1", "Main", "1", "dept-opd"],
  ["loc-opd2", "OPD-2", "OPD Consulting 2", "Main", "1", "dept-opd"],
  ["loc-opd3", "OPD-3", "OPD Consulting 3", "Main", "1", "dept-opd"],
  ["loc-opdhall", "OPD-H", "OPD Hall", "Main", "1", "dept-opd"],
  ["loc-img", "IMG", "Imaging Suite", "Main", "1", "dept-img"],
  ["loc-ward-a", "WD-A", "Ward A", "Annex", "3", "dept-ipd"],
  ["loc-ward-b", "WD-B", "Ward B", "Annex", "3", "dept-ipd"],
  ["loc-cssd", "CSSD", "CSSD", "Service", "0", "dept-cssd"],
  ["loc-pharm", "PHARM", "Pharmacy", "Main", "G", "dept-pharm"],
  ["loc-opt", "OPT", "Optical", "Main", "G", "dept-opt"],
  ["loc-plant", "PLANT", "Plant Room", "Service", "B", "dept-eng"],
  ["loc-elec", "ELEC", "Electrical Room", "Service", "B", "dept-eng"],
  ["loc-ahu", "AHU", "AHU Room", "Service", "2", "dept-eng"],
  ["loc-terrace", "TERR", "Terrace Plant", "Main", "R", "dept-eng"],
  ["loc-lobby", "LOBBY", "Main Lobby", "Main", "G", "dept-admin"],
  ["loc-admin", "ADM", "Admin Block", "Main", "1", "dept-admin"],
].map(([id, code, name, building, floor, department_id]) => ({
  id, code, name, building, floor, department_id,
}));

const staff = [
  ["stf-vikram", "Dr. Vikram Rao", "vikram.rao@helioseye.example", "9886001101", "hospital_management", "dept-admin"],
  ["stf-kavitha", "Kavitha Menon", "kavitha.menon@helioseye.example", "9886001102", "facility_manager", "dept-eng"],
  ["stf-arjun", "Arjun Deshpande", "arjun.deshpande@helioseye.example", "9886001103", "engineering_manager", "dept-eng"],
  ["stf-anita", "Anita Joseph", "anita.joseph@helioseye.example", "9886001104", "maintenance_engineer", "dept-eng"],
  ["stf-rahul", "Rahul Iyer", "rahul.iyer@helioseye.example", "9886001105", "technician", "dept-eng"],
  ["stf-deepa", "Deepa Krishnan", "deepa.krishnan@helioseye.example", "9886001106", "technician", "dept-eng"],
  ["stf-meera", "Meera Shah", "meera.shah@helioseye.example", "9886001107", "biomedical_engineer", "dept-bio"],
  ["stf-ravi", "Ravi Prasad", "ravi.prasad@helioseye.example", "9886001108", "electrical_engineer", "dept-eng"],
  ["stf-sanjay", "Sanjay Kulkarni", "sanjay.kulkarni@helioseye.example", "9886001109", "hvac_engineer", "dept-eng"],
  ["stf-nisha", "Nisha Fernandes", "nisha.fernandes@helioseye.example", "9886001110", "housekeeping_supervisor", "dept-hk"],
  ["stf-farhan", "Farhan Qureshi", "farhan.qureshi@helioseye.example", "9886001111", "security_safety", "dept-sec"],
  ["stf-leela", "Dr. Leela Nair", "leela.nair@helioseye.example", "9886001112", "department_user", "dept-ot"],
  ["stf-gopal", "Gopal Vendor", "service@zeiss-partner.example", "9886001199", "vendor", "dept-eng"],
].map(([id, name, email, phone, role, department_id]) => ({
  id, name, email, phone, role, department_id, status: "active", vendor_id: id === "stf-gopal" ? "vnd-zeiss" : null,
}));

const categories = [
  ["cat-med", "Medical Equipment", null, "medical", 1],
  ["cat-med-ot", "OT Equipment", "cat-med", "medical", 2],
  ["cat-med-opd", "OPD Diagnostics", "cat-med", "medical", 3],
  ["cat-med-img", "Imaging", "cat-med", "medical", 4],
  ["cat-ele", "Electrical", null, "electrical", 10],
  ["cat-hvac", "HVAC", null, "hvac", 20],
  ["cat-plb", "Plumbing", null, "plumbing", 30],
  ["cat-fire", "Fire & Safety", null, "fire_safety", 40],
].map(([id, name, parent_id, kind, sort_order]) => ({ id, name, parent_id, kind, sort_order }));

const vendors = [
  ["vnd-zeiss", "Carl Zeiss India", "Anand Pillai", "8040001001", "service.in@zeiss.example", "Biomedical AMC", "29AABCZ1234A1Z1", "MD-KA-2211", 4, 92, "Bengaluru"],
  ["vnd-alcon", "Alcon Laboratories", "Sneha Rao", "8040001002", "india.service@alcon.example", "Biomedical AMC", "29AABCA2234A1Z2", "MD-KA-1844", 6, 88, "Mumbai"],
  ["vnd-topcon", "Topcon Healthcare", "Imran Khan", "8040001003", "service@topcon.example", "Biomedical", "29AABCT3234A1Z3", "MD-KA-9901", 8, 85, "Chennai"],
  ["vnd-jci", "Johnson Controls", "Prakash N", "8040001004", "hvac@jci.example", "HVAC AMC", "29AABCJ4234A1Z4", "EL-KA-441", 6, 90, "Bengaluru"],
  ["vnd-schneider", "Schneider Electric", "Latha Gowda", "8040001005", "power@se.example", "Electrical", "29AABCS5234A1Z5", "EL-KA-118", 4, 91, "Bengaluru"],
  ["vnd-kirloskar", "Kirloskar Oil Engines", "Manoj Patil", "8040001006", "dg@koel.example", "DG AMC", "27AABCK6234A1Z6", "EL-MH-77", 6, 87, "Pune"],
  ["vnd-voltas", "Voltas Limited", "Rekha Iyer", "8040001007", "chiller@voltas.example", "HVAC", "29AABCV7234A1Z7", "EL-KA-220", 8, 84, "Bengaluru"],
  ["vnd-numeric", "Numeric Power Systems", "Ajay Bhat", "8040001008", "ups@numeric.example", "UPS/Batteries", "33AABCN8234A1Z8", "EL-TN-55", 4, 89, "Chennai"],
  ["vnd-firepro", "FirePro Safety Systems", "Sunil Shetty", "8040001009", "ops@firepro.example", "Fire & Safety", "29AABCF9234A1Z9", "FS-KA-301", 4, 93, "Bengaluru"],
  ["vnd-aqua", "AquaPure Engineers", "Bindu Raj", "8040001010", "ro@aquapure.example", "Water / RO", "29AABCA0234A1ZA", "PL-KA-19", 8, 86, "Bengaluru"],
  ["vnd-local", "Helios Biomedical Services", "Gopal R", "9886001199", "service@zeiss-partner.example", "On-call biomedical", "29AABCH1111A1Z1", "MD-KA-700", 12, 78, "Bengaluru"],
].map(([id, name, contact_person, phone, email, service_category, gstin, license_no, sla_hours, performance_score, city]) => ({
  id, name, contact_person, phone, email, service_category, gstin, license_no, sla_hours, performance_score, city, status: "active",
}));

/** @type {Array<Record<string, unknown>>} */
const assets = [];
function ast(row) {
  assets.push({
    status: "operational",
    criticality: "medium",
    risk_level: "medium",
    calibration_required: false,
    total_breakdown_count: 0,
    total_downtime_minutes: 0,
    maintenance_cost: 0,
    spare_cost: 0,
    warranty_months: 24,
    ...row,
  });
}

const A = (n, rest) => ast({ id: rest.asset_code, ...rest, purchase_cost: n });

A(6800000, { asset_code: "MED-OT-001", name: "Zeiss OPMI Lumera 700", category_id: "cat-med-ot", sub_category: "Operating microscope", department_id: "dept-ot", location_id: "loc-ot1", room: "OT-1", manufacturer: "Carl Zeiss", model: "OPMI Lumera 700", serial_number: "ZL700-88421", installation_date: "2023-04-12", purchase_date: "2023-03-01", warranty_expiry: "2025-03-01", vendor_id: "vnd-zeiss", criticality: "critical", risk_level: "high", responsible_staff_id: "stf-meera", maintenance_frequency: "quarterly", calibration_required: true, last_maintenance: "2026-09-05", next_maintenance: "2026-12-05", last_breakdown: "2026-09-20", total_breakdown_count: 3, total_downtime_minutes: 420, maintenance_cost: 186000, spare_cost: 42000 });
A(4200000, { asset_code: "MED-OT-002", name: "Zeiss OPMI Lumera 300", category_id: "cat-med-ot", sub_category: "Operating microscope", department_id: "dept-ot", location_id: "loc-ot2", room: "OT-2", manufacturer: "Carl Zeiss", model: "OPMI Lumera 300", serial_number: "ZL300-55109", installation_date: "2022-11-08", purchase_date: "2022-10-02", warranty_expiry: "2024-10-02", vendor_id: "vnd-zeiss", criticality: "critical", risk_level: "high", responsible_staff_id: "stf-meera", maintenance_frequency: "quarterly", calibration_required: true, last_maintenance: "2026-08-12", next_maintenance: "2026-11-12", total_breakdown_count: 1, total_downtime_minutes: 90, maintenance_cost: 74000 });
A(3100000, { asset_code: "MED-OT-003", name: "Alcon Centurion Phaco", category_id: "cat-med-ot", sub_category: "Phaco machine", department_id: "dept-ot", location_id: "loc-ot1", room: "OT-1", manufacturer: "Alcon", model: "Centurion Silver", serial_number: "CEN-22091", installation_date: "2024-01-18", purchase_date: "2023-12-10", warranty_expiry: "2025-12-10", vendor_id: "vnd-alcon", criticality: "critical", risk_level: "high", responsible_staff_id: "stf-meera", maintenance_frequency: "monthly", calibration_required: true, last_maintenance: "2026-09-02", next_maintenance: "2026-10-02", total_breakdown_count: 2, total_downtime_minutes: 180, maintenance_cost: 96000, spare_cost: 28000 });
A(2400000, { asset_code: "MED-OT-004", name: "Alcon Infiniti Phaco", category_id: "cat-med-ot", sub_category: "Phaco machine", department_id: "dept-ot", location_id: "loc-ot2", room: "OT-2", manufacturer: "Alcon", model: "Infiniti Vision", serial_number: "INF-11802", installation_date: "2021-06-20", purchase_date: "2021-05-11", warranty_expiry: "2023-05-11", vendor_id: "vnd-alcon", criticality: "high", risk_level: "medium", responsible_staff_id: "stf-meera", maintenance_frequency: "monthly", last_maintenance: "2026-08-28", next_maintenance: "2026-09-28", total_breakdown_count: 4, total_downtime_minutes: 510, maintenance_cost: 142000, spare_cost: 61000 });
A(1850000, { asset_code: "MED-OT-005", name: "Lumenis Selecta Duet Laser", category_id: "cat-med-ot", sub_category: "Laser equipment", department_id: "dept-ot", location_id: "loc-laser", room: "Laser", manufacturer: "Lumenis", model: "Selecta Duet", serial_number: "LSD-7731", installation_date: "2022-02-14", purchase_date: "2022-01-09", warranty_expiry: "2024-01-09", vendor_id: "vnd-local", criticality: "high", risk_level: "high", responsible_staff_id: "stf-meera", maintenance_frequency: "quarterly", calibration_required: true, last_maintenance: "2026-07-21", next_maintenance: "2026-10-21" });
A(980000, { asset_code: "MED-OT-006", name: "Tuttnauer Autoclave 3870", category_id: "cat-med-ot", sub_category: "Autoclave", department_id: "dept-cssd", location_id: "loc-cssd", room: "CSSD-1", manufacturer: "Tuttnauer", model: "3870EA", serial_number: "TT-3870-441", installation_date: "2020-09-01", purchase_date: "2020-08-12", warranty_expiry: "2022-08-12", vendor_id: "vnd-local", criticality: "critical", risk_level: "high", responsible_staff_id: "stf-anita", maintenance_frequency: "monthly", last_maintenance: "2026-09-10", next_maintenance: "2026-10-10", last_breakdown: "2026-09-18", total_breakdown_count: 2, total_downtime_minutes: 240, maintenance_cost: 38000 });
A(720000, { asset_code: "MED-OT-007", name: "Steris Century Autoclave", category_id: "cat-med-ot", sub_category: "Autoclave", department_id: "dept-cssd", location_id: "loc-cssd", room: "CSSD-2", manufacturer: "Steris", model: "Century V116", serial_number: "ST-V116-09", installation_date: "2023-07-04", purchase_date: "2023-06-01", warranty_expiry: "2025-06-01", vendor_id: "vnd-local", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-10", next_maintenance: "2026-10-10", responsible_staff_id: "stf-anita" });
A(210000, { asset_code: "MED-OT-008", name: "Mindray ePM 12 OT-1", category_id: "cat-med-ot", sub_category: "Patient monitor", department_id: "dept-ot", location_id: "loc-ot1", room: "OT-1", manufacturer: "Mindray", model: "ePM 12M", serial_number: "MR-12-1001", installation_date: "2023-04-12", purchase_date: "2023-03-20", warranty_expiry: "2026-03-20", vendor_id: "vnd-local", criticality: "critical", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-08-01", next_maintenance: "2026-11-01", responsible_staff_id: "stf-meera" });
A(210000, { asset_code: "MED-OT-009", name: "Mindray ePM 12 OT-2", category_id: "cat-med-ot", sub_category: "Patient monitor", department_id: "dept-ot", location_id: "loc-ot2", room: "OT-2", manufacturer: "Mindray", model: "ePM 12M", serial_number: "MR-12-1002", installation_date: "2023-04-12", purchase_date: "2023-03-20", warranty_expiry: "2026-03-20", vendor_id: "vnd-local", criticality: "critical", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-08-01", next_maintenance: "2026-11-01", responsible_staff_id: "stf-meera" });
A(185000, { asset_code: "MED-OT-010", name: "GE B450 Recovery Monitor", category_id: "cat-med-ot", sub_category: "Patient monitor", department_id: "dept-icu", location_id: "loc-rec", room: "Recovery", manufacturer: "GE Healthcare", model: "B450", serial_number: "GE-B450-77", installation_date: "2022-05-16", purchase_date: "2022-04-22", warranty_expiry: "2025-04-22", vendor_id: "vnd-local", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-07-18", next_maintenance: "2026-10-18", responsible_staff_id: "stf-meera" });
A(640000, { asset_code: "MED-OT-011", name: "Stryker OT Table OT-1", category_id: "cat-med-ot", sub_category: "OT equipment", department_id: "dept-ot", location_id: "loc-ot1", room: "OT-1", manufacturer: "Stryker", model: "5600", serial_number: "SK-5600-12", installation_date: "2023-04-10", purchase_date: "2023-03-01", warranty_expiry: "2026-03-01", vendor_id: "vnd-local", criticality: "high", maintenance_frequency: "half-yearly", last_maintenance: "2026-04-02", next_maintenance: "2026-10-02", responsible_staff_id: "stf-anita" });
A(420000, { asset_code: "MED-OT-012", name: "Drager Polaris OT Lights", category_id: "cat-med-ot", sub_category: "OT equipment", department_id: "dept-ot", location_id: "loc-ot1", room: "OT-1", manufacturer: "Drager", model: "Polaris 600", serial_number: "DR-P600-3", installation_date: "2023-04-10", purchase_date: "2023-03-01", warranty_expiry: "2026-03-01", vendor_id: "vnd-local", criticality: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-06-20", next_maintenance: "2026-09-20", responsible_staff_id: "stf-anita", status: "maintenance" });
A(95000, { asset_code: "MED-OT-013", name: "Medela Dominant Suction OT-1", category_id: "cat-med-ot", sub_category: "Suction machine", department_id: "dept-ot", location_id: "loc-ot1", room: "OT-1", manufacturer: "Medela", model: "Dominant Flex", serial_number: "MD-DF-441", installation_date: "2023-04-12", purchase_date: "2023-03-15", warranty_expiry: "2025-03-15", vendor_id: "vnd-local", maintenance_frequency: "monthly", last_maintenance: "2026-09-08", next_maintenance: "2026-10-08", responsible_staff_id: "stf-rahul" });
A(95000, { asset_code: "MED-OT-014", name: "Medela Dominant Suction OT-2", category_id: "cat-med-ot", sub_category: "Suction machine", department_id: "dept-ot", location_id: "loc-ot2", room: "OT-2", manufacturer: "Medela", model: "Dominant Flex", serial_number: "MD-DF-442", installation_date: "2023-04-12", purchase_date: "2023-03-15", warranty_expiry: "2025-03-15", vendor_id: "vnd-local", maintenance_frequency: "monthly", last_maintenance: "2026-09-08", next_maintenance: "2026-10-08", responsible_staff_id: "stf-rahul" });
A(380000, { asset_code: "MED-OPD-001", name: "Topcon SL-D7 Slit Lamp 1", category_id: "cat-med-opd", sub_category: "Slit lamp", department_id: "dept-opd", location_id: "loc-opd1", room: "C1", manufacturer: "Topcon", model: "SL-D7", serial_number: "TP-SLD7-101", installation_date: "2024-02-01", purchase_date: "2024-01-12", warranty_expiry: "2027-01-12", vendor_id: "vnd-topcon", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-08-14", next_maintenance: "2026-11-14", responsible_staff_id: "stf-meera" });
A(380000, { asset_code: "MED-OPD-002", name: "Topcon SL-D7 Slit Lamp 2", category_id: "cat-med-opd", sub_category: "Slit lamp", department_id: "dept-opd", location_id: "loc-opd2", room: "C2", manufacturer: "Topcon", model: "SL-D7", serial_number: "TP-SLD7-102", installation_date: "2024-02-01", purchase_date: "2024-01-12", warranty_expiry: "2027-01-12", vendor_id: "vnd-topcon", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-08-14", next_maintenance: "2026-11-14", responsible_staff_id: "stf-meera" });
A(620000, { asset_code: "MED-OPD-003", name: "Haag-Streit BQ 900", category_id: "cat-med-opd", sub_category: "Slit lamp", department_id: "dept-opd", location_id: "loc-opd3", room: "C3", manufacturer: "Haag-Streit", model: "BQ 900", serial_number: "HS-BQ-2201", installation_date: "2021-09-09", purchase_date: "2021-08-01", warranty_expiry: "2023-08-01", vendor_id: "vnd-local", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-07-02", next_maintenance: "2026-10-02", responsible_staff_id: "stf-meera", total_breakdown_count: 1, total_downtime_minutes: 60 });
A(540000, { asset_code: "MED-OPD-004", name: "Nidek ARK-1 Autorefractometer", category_id: "cat-med-opd", sub_category: "Auto refractometer", department_id: "dept-opd", location_id: "loc-opdhall", room: "Refraction", manufacturer: "Nidek", model: "ARK-1", serial_number: "ND-ARK1-88", installation_date: "2023-01-20", purchase_date: "2022-12-15", warranty_expiry: "2024-12-15", vendor_id: "vnd-local", calibration_required: true, maintenance_frequency: "half-yearly", last_maintenance: "2026-04-11", next_maintenance: "2026-10-11", responsible_staff_id: "stf-meera" });
A(310000, { asset_code: "MED-OPD-005", name: "Nidek KM-1 Keratometer", category_id: "cat-med-opd", sub_category: "Keratometer", department_id: "dept-opd", location_id: "loc-opdhall", room: "Refraction", manufacturer: "Nidek", model: "KM-1", serial_number: "ND-KM1-14", installation_date: "2023-01-20", purchase_date: "2022-12-15", warranty_expiry: "2024-12-15", vendor_id: "vnd-local", calibration_required: true, maintenance_frequency: "half-yearly", last_maintenance: "2026-04-11", next_maintenance: "2026-10-11", responsible_staff_id: "stf-meera" });
A(4500000, { asset_code: "MED-IMG-001", name: "Zeiss Cirrus HD-OCT 5000", category_id: "cat-med-img", sub_category: "OCT", department_id: "dept-img", location_id: "loc-img", room: "OCT", manufacturer: "Carl Zeiss", model: "Cirrus 5000", serial_number: "OCT-5000-331", installation_date: "2024-05-06", purchase_date: "2024-04-01", warranty_expiry: "2027-04-01", vendor_id: "vnd-zeiss", criticality: "critical", risk_level: "high", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-08-22", next_maintenance: "2026-11-22", responsible_staff_id: "stf-meera", total_breakdown_count: 1, total_downtime_minutes: 150, maintenance_cost: 54000 });
A(2100000, { asset_code: "MED-IMG-002", name: "Canon CR-2 AF Fundus Camera", category_id: "cat-med-img", sub_category: "Fundus camera", department_id: "dept-img", location_id: "loc-img", room: "Fundus", manufacturer: "Canon", model: "CR-2 AF", serial_number: "CN-CR2-019", installation_date: "2022-08-18", purchase_date: "2022-07-04", warranty_expiry: "2024-07-04", vendor_id: "vnd-local", criticality: "high", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-07-30", next_maintenance: "2026-10-30", responsible_staff_id: "stf-meera" });
A(2800000, { asset_code: "MED-IMG-003", name: "Humphrey Field Analyzer 3", category_id: "cat-med-img", sub_category: "Visual field analyzer", department_id: "dept-img", location_id: "loc-img", room: "Perimetry", manufacturer: "Zeiss", model: "HFA3 860", serial_number: "HFA3-860-55", installation_date: "2023-09-12", purchase_date: "2023-08-01", warranty_expiry: "2026-08-01", vendor_id: "vnd-zeiss", criticality: "high", calibration_required: true, maintenance_frequency: "quarterly", last_maintenance: "2026-09-01", next_maintenance: "2026-12-01", responsible_staff_id: "stf-meera" });
A(78000, { asset_code: "MED-IPD-001", name: "BPL Cardiart 6208 ECG", category_id: "cat-med", sub_category: "ECG", department_id: "dept-ipd", location_id: "loc-ward-a", room: "Ward A", manufacturer: "BPL", model: "Cardiart 6208 View", serial_number: "BPL-6208-31", installation_date: "2022-03-03", purchase_date: "2022-02-11", warranty_expiry: "2024-02-11", vendor_id: "vnd-local", calibration_required: true, maintenance_frequency: "half-yearly", last_maintenance: "2026-03-15", next_maintenance: "2026-09-15", responsible_staff_id: "stf-meera", status: "operational" });
A(1450000, { asset_code: "ELE-TR-001", name: "500 kVA Distribution Transformer", category_id: "cat-ele", sub_category: "Transformer", department_id: "dept-eng", location_id: "loc-elec", room: "Yard", manufacturer: "Kirloskar", model: "500kVA 11/0.433", serial_number: "TR-500- hel-01", installation_date: "2019-06-01", purchase_date: "2019-04-12", warranty_expiry: "2021-04-12", vendor_id: "vnd-schneider", criticality: "critical", risk_level: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-07-08", next_maintenance: "2026-10-08", responsible_staff_id: "stf-ravi" });
A(2100000, { asset_code: "ELE-DG-001", name: "Kirloskar 250 kVA DG", category_id: "cat-ele", sub_category: "DG", department_id: "dept-eng", location_id: "loc-terrace", room: "DG-1", manufacturer: "Kirloskar", model: "KG1-250WS", serial_number: "KOEL-250-882", installation_date: "2020-01-15", purchase_date: "2019-12-02", warranty_expiry: "2022-12-02", vendor_id: "vnd-kirloskar", criticality: "critical", risk_level: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-12", next_maintenance: "2026-10-12", responsible_staff_id: "stf-ravi", total_breakdown_count: 1, total_downtime_minutes: 75, maintenance_cost: 64000 });
A(980000, { asset_code: "ELE-DG-002", name: "Cummins 125 kVA Standby DG", category_id: "cat-ele", sub_category: "DG", department_id: "dept-eng", location_id: "loc-terrace", room: "DG-2", manufacturer: "Cummins", model: "C125 D5", serial_number: "CUM-125-44", installation_date: "2021-11-02", purchase_date: "2021-10-01", warranty_expiry: "2023-10-01", vendor_id: "vnd-kirloskar", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-12", next_maintenance: "2026-10-12", responsible_staff_id: "stf-ravi" });
A(760000, { asset_code: "ELE-UPS-001", name: "Numeric 80 kVA UPS", category_id: "cat-ele", sub_category: "UPS", department_id: "dept-eng", location_id: "loc-elec", room: "UPS", manufacturer: "Numeric", model: "HPE 80kVA", serial_number: "NUM-80-221", installation_date: "2022-04-19", purchase_date: "2022-03-08", warranty_expiry: "2025-03-08", vendor_id: "vnd-numeric", criticality: "critical", risk_level: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-08-05", next_maintenance: "2026-11-05", responsible_staff_id: "stf-ravi", last_breakdown: "2026-09-16", total_breakdown_count: 2, total_downtime_minutes: 110, maintenance_cost: 48000, spare_cost: 22000, status: "operational" });
A(410000, { asset_code: "ELE-UPS-002", name: "Numeric 40 kVA OT UPS", category_id: "cat-ele", sub_category: "UPS", department_id: "dept-ot", location_id: "loc-elec", room: "OT UPS", manufacturer: "Numeric", model: "HPE 40kVA", serial_number: "NUM-40-118", installation_date: "2023-04-10", purchase_date: "2023-03-01", warranty_expiry: "2026-03-01", vendor_id: "vnd-numeric", criticality: "critical", maintenance_frequency: "quarterly", last_maintenance: "2026-08-05", next_maintenance: "2026-11-05", responsible_staff_id: "stf-ravi" });
A(240000, { asset_code: "ELE-UPS-003", name: "APC 20 kVA Imaging UPS", category_id: "cat-ele", sub_category: "UPS", department_id: "dept-img", location_id: "loc-elec", room: "Imaging UPS", manufacturer: "APC", model: "MGE 20kVA", serial_number: "APC-20-07", installation_date: "2024-05-06", purchase_date: "2024-04-01", warranty_expiry: "2027-04-01", vendor_id: "vnd-numeric", criticality: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-08-05", next_maintenance: "2026-11-05", responsible_staff_id: "stf-ravi" });
A(890000, { asset_code: "ELE-PNL-001", name: "Main LT Panel", category_id: "cat-ele", sub_category: "Electrical panels", department_id: "dept-eng", location_id: "loc-elec", room: "LT", manufacturer: "Schneider", model: "Blokset", serial_number: "SE-LT-01", installation_date: "2019-06-01", purchase_date: "2019-04-12", warranty_expiry: "2021-04-12", vendor_id: "vnd-schneider", criticality: "critical", maintenance_frequency: "quarterly", last_maintenance: "2026-07-08", next_maintenance: "2026-10-08", responsible_staff_id: "stf-ravi" });
A(320000, { asset_code: "ELE-PNL-002", name: "OT MCC Panel", category_id: "cat-ele", sub_category: "MCC", department_id: "dept-ot", location_id: "loc-elec", room: "OT MCC", manufacturer: "Schneider", model: "OKKEN", serial_number: "SE-MCC-OT", installation_date: "2023-04-10", purchase_date: "2023-03-01", warranty_expiry: "2026-03-01", vendor_id: "vnd-schneider", criticality: "critical", maintenance_frequency: "quarterly", last_maintenance: "2026-07-08", next_maintenance: "2026-10-08", responsible_staff_id: "stf-ravi" });
A(85000, { asset_code: "ELE-DB-001", name: "OPD Distribution Board", category_id: "cat-ele", sub_category: "DB", department_id: "dept-opd", location_id: "loc-opdhall", room: "Electrical closet", manufacturer: "Legrand", model: "XL3 160", serial_number: "LG-DB-OPD", installation_date: "2021-02-01", purchase_date: "2021-01-10", warranty_expiry: "2023-01-10", vendor_id: "vnd-schneider", maintenance_frequency: "half-yearly", last_maintenance: "2026-05-20", next_maintenance: "2026-11-20", responsible_staff_id: "stf-ravi" });
A(360000, { asset_code: "ELE-BAT-001", name: "UPS Battery Bank 80 kVA", category_id: "cat-ele", sub_category: "Batteries", department_id: "dept-eng", location_id: "loc-elec", room: "Battery", manufacturer: "Exide", model: "12V 100Ah x 32", serial_number: "EX-BB-80", installation_date: "2022-04-19", purchase_date: "2022-03-08", warranty_expiry: "2025-03-08", vendor_id: "vnd-numeric", criticality: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-08-05", next_maintenance: "2026-11-05", responsible_staff_id: "stf-ravi" });
A(180000, { asset_code: "ELE-LGT-001", name: "Emergency Lighting Circuit", category_id: "cat-ele", sub_category: "Emergency lighting", department_id: "dept-eng", location_id: "loc-lobby", room: "Campus", manufacturer: "Philips", model: "Emergency LED circuit", serial_number: "PH-EL-01", installation_date: "2021-08-08", purchase_date: "2021-07-01", warranty_expiry: "2023-07-01", vendor_id: "vnd-schneider", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-01", next_maintenance: "2026-10-01", responsible_staff_id: "stf-ravi" });
A(65000, { asset_code: "ELE-EAR-001", name: "Hospital Earthing System", category_id: "cat-ele", sub_category: "Earthing system", department_id: "dept-eng", location_id: "loc-elec", room: "Pits", manufacturer: "JMV LPS", model: "Chemical earthing x 8", serial_number: "EAR-HOS-01", installation_date: "2019-06-01", purchase_date: "2019-04-12", warranty_expiry: "2024-04-12", vendor_id: "vnd-schneider", criticality: "high", maintenance_frequency: "annual", last_maintenance: "2026-01-18", next_maintenance: "2027-01-18", responsible_staff_id: "stf-ravi" });
A(3200000, { asset_code: "HVAC-CH-001", name: "York 120 TR Air-Cooled Chiller", category_id: "cat-hvac", sub_category: "Chiller", department_id: "dept-eng", location_id: "loc-terrace", room: "Chiller yard", manufacturer: "York / JCI", model: "YVAA 120", serial_number: "YK-120-07", installation_date: "2021-03-22", purchase_date: "2021-01-15", warranty_expiry: "2024-01-15", vendor_id: "vnd-jci", criticality: "critical", risk_level: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-06", next_maintenance: "2026-10-06", responsible_staff_id: "stf-sanjay", total_breakdown_count: 2, total_downtime_minutes: 360, maintenance_cost: 210000, spare_cost: 88000 });
A(780000, { asset_code: "HVAC-AHU-001", name: "OT-1 AHU with HEPA", category_id: "cat-hvac", sub_category: "AHU", department_id: "dept-ot", location_id: "loc-ahu", room: "AHU-OT1", manufacturer: "Zeco", model: "25 TR HEPA", serial_number: "ZC-AHU-OT1", installation_date: "2023-04-08", purchase_date: "2023-02-20", warranty_expiry: "2026-02-20", vendor_id: "vnd-jci", criticality: "critical", risk_level: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-14", next_maintenance: "2026-10-14", responsible_staff_id: "stf-sanjay" });
A(780000, { asset_code: "HVAC-AHU-002", name: "OT-2 AHU with HEPA", category_id: "cat-hvac", sub_category: "AHU", department_id: "dept-ot", location_id: "loc-ahu", room: "AHU-OT2", manufacturer: "Zeco", model: "25 TR HEPA", serial_number: "ZC-AHU-OT2", installation_date: "2023-04-08", purchase_date: "2023-02-20", warranty_expiry: "2026-02-20", vendor_id: "vnd-jci", criticality: "critical", maintenance_frequency: "monthly", last_maintenance: "2026-09-14", next_maintenance: "2026-10-14", responsible_staff_id: "stf-sanjay" });
A(780000, { asset_code: "HVAC-AHU-003", name: "OT-3 AHU with HEPA", category_id: "cat-hvac", sub_category: "AHU", department_id: "dept-ot", location_id: "loc-ahu", room: "AHU-OT3", manufacturer: "Zeco", model: "25 TR HEPA", serial_number: "ZC-AHU-OT3", installation_date: "2024-08-12", purchase_date: "2024-07-01", warranty_expiry: "2027-07-01", vendor_id: "vnd-jci", criticality: "critical", maintenance_frequency: "monthly", last_maintenance: "2026-09-14", next_maintenance: "2026-10-14", responsible_staff_id: "stf-sanjay" });
A(540000, { asset_code: "HVAC-AHU-004", name: "Imaging AHU", category_id: "cat-hvac", sub_category: "AHU", department_id: "dept-img", location_id: "loc-ahu", room: "AHU-IMG", manufacturer: "Zeco", model: "15 TR", serial_number: "ZC-AHU-IMG", installation_date: "2024-05-01", purchase_date: "2024-04-01", warranty_expiry: "2027-04-01", vendor_id: "vnd-jci", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-14", next_maintenance: "2026-10-14", responsible_staff_id: "stf-sanjay" });
A(48000, { asset_code: "HVAC-FCU-001", name: "Ward A FCU-1", category_id: "cat-hvac", sub_category: "FCU", department_id: "dept-ipd", location_id: "loc-ward-a", room: "Bay 1", manufacturer: "Voltas", model: "FCU 1.5 TR", serial_number: "VT-FCU-A1", installation_date: "2022-06-01", purchase_date: "2022-05-01", warranty_expiry: "2024-05-01", vendor_id: "vnd-voltas", maintenance_frequency: "quarterly", last_maintenance: "2026-07-22", next_maintenance: "2026-10-22", responsible_staff_id: "stf-sanjay" });
A(48000, { asset_code: "HVAC-FCU-002", name: "Ward A FCU-2", category_id: "cat-hvac", sub_category: "FCU", department_id: "dept-ipd", location_id: "loc-ward-a", room: "Bay 2", manufacturer: "Voltas", model: "FCU 1.5 TR", serial_number: "VT-FCU-A2", installation_date: "2022-06-01", purchase_date: "2022-05-01", warranty_expiry: "2024-05-01", vendor_id: "vnd-voltas", maintenance_frequency: "quarterly", last_maintenance: "2026-07-22", next_maintenance: "2026-10-22", responsible_staff_id: "stf-sanjay" });
A(42000, { asset_code: "HVAC-FCU-003", name: "Admin FCU", category_id: "cat-hvac", sub_category: "FCU", department_id: "dept-admin", location_id: "loc-admin", room: "Admin", manufacturer: "Voltas", model: "FCU 1.0 TR", serial_number: "VT-FCU-AD", installation_date: "2022-06-01", purchase_date: "2022-05-01", warranty_expiry: "2024-05-01", vendor_id: "vnd-voltas", maintenance_frequency: "quarterly", last_maintenance: "2026-07-22", next_maintenance: "2026-10-22", responsible_staff_id: "stf-sanjay" });
A(920000, { asset_code: "HVAC-VRF-001", name: "Daikin VRF OPD Block", category_id: "cat-hvac", sub_category: "VRF/VRV", department_id: "dept-opd", location_id: "loc-opdhall", room: "OPD", manufacturer: "Daikin", model: "VRV IV 20 HP", serial_number: "DK-VRV-20", installation_date: "2023-11-09", purchase_date: "2023-10-01", warranty_expiry: "2026-10-01", vendor_id: "vnd-voltas", criticality: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-08-18", next_maintenance: "2026-11-18", responsible_staff_id: "stf-sanjay", last_breakdown: "2026-09-11", total_breakdown_count: 1, total_downtime_minutes: 200 });
A(52000, { asset_code: "HVAC-AC-001", name: "Split AC Pharmacy", category_id: "cat-hvac", sub_category: "Split AC", department_id: "dept-pharm", location_id: "loc-pharm", room: "Pharmacy", manufacturer: "Daikin", model: "FTKM50", serial_number: "DK-PH-01", installation_date: "2024-03-03", purchase_date: "2024-02-20", warranty_expiry: "2027-02-20", vendor_id: "vnd-voltas", maintenance_frequency: "quarterly", last_maintenance: "2026-08-18", next_maintenance: "2026-11-18", responsible_staff_id: "stf-deepa" });
A(38000, { asset_code: "HVAC-AC-002", name: "Split AC Optical", category_id: "cat-hvac", sub_category: "Split AC", department_id: "dept-opt", location_id: "loc-opt", room: "Optical", manufacturer: "Voltas", model: "183V DZR", serial_number: "VT-OPT-01", installation_date: "2023-05-05", purchase_date: "2023-04-20", warranty_expiry: "2026-04-20", vendor_id: "vnd-voltas", maintenance_frequency: "quarterly", last_maintenance: "2026-08-18", next_maintenance: "2026-11-18", responsible_staff_id: "stf-deepa" });
A(62000, { asset_code: "HVAC-EX-001", name: "CSSD Exhaust System", category_id: "cat-hvac", sub_category: "Exhaust fans", department_id: "dept-cssd", location_id: "loc-cssd", room: "CSSD", manufacturer: "Greenheck", model: "CUE-090", serial_number: "GH-EX-CSSD", installation_date: "2020-09-01", purchase_date: "2020-08-12", warranty_expiry: "2022-08-12", vendor_id: "vnd-jci", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-09", next_maintenance: "2026-10-09", responsible_staff_id: "stf-sanjay" });
A(210000, { asset_code: "HVAC-FA-001", name: "Fresh Air Handling Unit", category_id: "cat-hvac", sub_category: "Fresh air system", department_id: "dept-eng", location_id: "loc-ahu", room: "FAHU", manufacturer: "Zeco", model: "FAHU 8000 CMH", serial_number: "ZC-FA-01", installation_date: "2023-04-08", purchase_date: "2023-02-20", warranty_expiry: "2026-02-20", vendor_id: "vnd-jci", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-14", next_maintenance: "2026-10-14", responsible_staff_id: "stf-sanjay" });
A(145000, { asset_code: "PLB-PMP-001", name: "Hydro-Pneumatic Pump Set", category_id: "cat-plb", sub_category: "Water pumps", department_id: "dept-eng", location_id: "loc-plant", room: "Pump room", manufacturer: "Grundfos", model: "CME 5-4 x 2", serial_number: "GF-HP-01", installation_date: "2021-08-01", purchase_date: "2021-07-01", warranty_expiry: "2023-07-01", vendor_id: "vnd-aqua", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-04", next_maintenance: "2026-10-04", responsible_staff_id: "stf-rahul", last_breakdown: "2026-09-08", total_breakdown_count: 2, total_downtime_minutes: 160 });
A(420000, { asset_code: "PLB-RO-001", name: "1000 LPH RO Plant", category_id: "cat-plb", sub_category: "RO plant", department_id: "dept-eng", location_id: "loc-plant", room: "RO", manufacturer: "Ion Exchange", model: "INDION 1000", serial_number: "IE-RO-1000", installation_date: "2022-01-11", purchase_date: "2021-12-01", warranty_expiry: "2023-12-01", vendor_id: "vnd-aqua", criticality: "critical", maintenance_frequency: "monthly", last_maintenance: "2026-09-07", next_maintenance: "2026-10-07", responsible_staff_id: "stf-rahul", total_breakdown_count: 1, total_downtime_minutes: 90, maintenance_cost: 18000 });
A(280000, { asset_code: "PLB-TNK-001", name: "Terrace Tank 20 KL", category_id: "cat-plb", sub_category: "Water tanks", department_id: "dept-eng", location_id: "loc-terrace", room: "Terrace", manufacturer: "Sintex", model: "20 KL SMC", serial_number: "SX-T20", installation_date: "2019-06-01", purchase_date: "2019-05-01", warranty_expiry: "2024-05-01", vendor_id: "vnd-aqua", maintenance_frequency: "quarterly", last_maintenance: "2026-07-01", next_maintenance: "2026-10-01", responsible_staff_id: "stf-rahul" });
A(360000, { asset_code: "PLB-TNK-002", name: "Underground Sum 50 KL", category_id: "cat-plb", sub_category: "Water tanks", department_id: "dept-eng", location_id: "loc-plant", room: "UG tank", manufacturer: "Civil", model: "RCC 50 KL", serial_number: "UG-50", installation_date: "2019-06-01", purchase_date: "2019-05-01", warranty_expiry: "2029-05-01", vendor_id: "vnd-aqua", criticality: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-07-01", next_maintenance: "2026-10-01", responsible_staff_id: "stf-rahul" });
A(190000, { asset_code: "PLB-HW-001", name: "Heat Pump Hot Water", category_id: "cat-plb", sub_category: "Hot water system", department_id: "dept-eng", location_id: "loc-plant", room: "Hot water", manufacturer: "Emerson", model: "HP 500 LPD", serial_number: "EM-HP-01", installation_date: "2023-10-10", purchase_date: "2023-09-01", warranty_expiry: "2026-09-01", vendor_id: "vnd-aqua", maintenance_frequency: "quarterly", last_maintenance: "2026-06-12", next_maintenance: "2026-09-12", responsible_staff_id: "stf-rahul", status: "maintenance" });
A(540000, { asset_code: "PLB-DRN-001", name: "STP / Drainage System", category_id: "cat-plb", sub_category: "Drainage system", department_id: "dept-eng", location_id: "loc-plant", room: "STP", manufacturer: "Ion Exchange", model: "25 KLD MBBR", serial_number: "IE-STP-25", installation_date: "2021-08-01", purchase_date: "2021-06-01", warranty_expiry: "2023-06-01", vendor_id: "vnd-aqua", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-03", next_maintenance: "2026-10-03", responsible_staff_id: "stf-rahul" });
A(185000, { asset_code: "FIR-ALM-001", name: "Notifier Fire Alarm Panel", category_id: "cat-fire", sub_category: "Fire alarm", department_id: "dept-sec", location_id: "loc-lobby", room: "Security desk", manufacturer: "Honeywell Notifier", model: "NFS2-640", serial_number: "NF-640-19", installation_date: "2021-08-08", purchase_date: "2021-07-01", warranty_expiry: "2024-07-01", vendor_id: "vnd-firepro", criticality: "critical", risk_level: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-02", next_maintenance: "2026-10-02", responsible_staff_id: "stf-farhan" });
A(28000, { asset_code: "FIR-EXT-001", name: "CO2 Extinguisher Bank OT", category_id: "cat-fire", sub_category: "Fire extinguishers", department_id: "dept-ot", location_id: "loc-ot1", room: "OT corridor", manufacturer: "Minimax", model: "CO2 4.5kg x 8", serial_number: "MX-CO2-OT", installation_date: "2023-04-12", purchase_date: "2023-03-01", warranty_expiry: "2026-03-01", vendor_id: "vnd-firepro", criticality: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-07-15", next_maintenance: "2026-10-15", responsible_staff_id: "stf-farhan" });
A(22000, { asset_code: "FIR-EXT-002", name: "ABC Extinguishers OPD", category_id: "cat-fire", sub_category: "Fire extinguishers", department_id: "dept-opd", location_id: "loc-opdhall", room: "OPD", manufacturer: "Ceasefire", model: "ABC 6kg x 12", serial_number: "CF-ABC-OPD", installation_date: "2023-02-01", purchase_date: "2023-01-10", warranty_expiry: "2026-01-10", vendor_id: "vnd-firepro", maintenance_frequency: "quarterly", last_maintenance: "2026-07-15", next_maintenance: "2026-10-15", responsible_staff_id: "stf-farhan" });
A(95000, { asset_code: "FIR-HYD-001", name: "Hydrant Landing Valves", category_id: "cat-fire", sub_category: "Hydrant", department_id: "dept-sec", location_id: "loc-lobby", room: "Risers", manufacturer: "Newage", model: "Landing valve SS", serial_number: "NA-HYD-01", installation_date: "2021-08-08", purchase_date: "2021-07-01", warranty_expiry: "2024-07-01", vendor_id: "vnd-firepro", criticality: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-02", next_maintenance: "2026-10-02", responsible_staff_id: "stf-farhan" });
A(310000, { asset_code: "FIR-SPR-001", name: "Sprinkler System", category_id: "cat-fire", sub_category: "Sprinkler", department_id: "dept-sec", location_id: "loc-lobby", room: "Campus", manufacturer: "Tyco", model: "Wet pipe", serial_number: "TY-SPR-HOS", installation_date: "2021-08-08", purchase_date: "2021-07-01", warranty_expiry: "2024-07-01", vendor_id: "vnd-firepro", criticality: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-06-10", next_maintenance: "2026-09-10", responsible_staff_id: "stf-farhan" });
A(240000, { asset_code: "FIR-PMP-001", name: "Fire Pump 75 HP", category_id: "cat-fire", sub_category: "Fire pump", department_id: "dept-eng", location_id: "loc-plant", room: "Fire pump", manufacturer: "Kirloskar", model: "75 HP diesel + jockey", serial_number: "KOEL-FP-75", installation_date: "2021-08-08", purchase_date: "2021-07-01", warranty_expiry: "2024-07-01", vendor_id: "vnd-firepro", criticality: "critical", risk_level: "high", maintenance_frequency: "monthly", last_maintenance: "2026-09-02", next_maintenance: "2026-10-02", responsible_staff_id: "stf-farhan" });
A(54000, { asset_code: "FIR-EXI-001", name: "Emergency Exit Signage", category_id: "cat-fire", sub_category: "Emergency exit", department_id: "dept-sec", location_id: "loc-lobby", room: "Egress", manufacturer: "Legrand", model: "Photoluminescent + LED", serial_number: "LG-EX-01", installation_date: "2021-08-08", purchase_date: "2021-07-01", warranty_expiry: "2024-07-01", vendor_id: "vnd-firepro", maintenance_frequency: "monthly", last_maintenance: "2026-09-01", next_maintenance: "2026-10-01", responsible_staff_id: "stf-farhan" });
A(120000, { asset_code: "FIR-SMK-001", name: "Smoke Detector Loop", category_id: "cat-fire", sub_category: "Smoke detectors", department_id: "dept-sec", location_id: "loc-lobby", room: "Campus", manufacturer: "Notifier", model: "FSP-851 x 86", serial_number: "NF-SMK-01", installation_date: "2021-08-08", purchase_date: "2021-07-01", warranty_expiry: "2024-07-01", vendor_id: "vnd-firepro", criticality: "high", maintenance_frequency: "quarterly", last_maintenance: "2026-06-10", next_maintenance: "2026-09-10", responsible_staff_id: "stf-farhan" });

const contracts = [
  { id: "amc-zeiss-ot", vendor_id: "vnd-zeiss", contract_number: "AMC-ZEISS-2026-01", asset_id: "MED-OT-001", contract_type: "AMC", start_date: "2026-03-01", end_date: "2027-02-28", contract_value: 240000, visits_included: 4, pm_visits: 4, breakdown_coverage: true, response_hours: 4, sla_text: "4h response, 24h restoration for OT microscopes", contact_person: "Anand Pillai", phone: "8040001001", email: "service.in@zeiss.example", status: "active" },
  { id: "cmc-zeiss-oct", vendor_id: "vnd-zeiss", contract_number: "CMC-ZEISS-2026-02", asset_id: "MED-IMG-001", contract_type: "CMC", start_date: "2026-04-01", end_date: "2027-03-31", contract_value: 310000, visits_included: 4, pm_visits: 4, breakdown_coverage: true, response_hours: 8, sla_text: "Next-business-day on-site", contact_person: "Anand Pillai", phone: "8040001001", email: "service.in@zeiss.example", status: "active" },
  { id: "amc-zeiss-hfa", vendor_id: "vnd-zeiss", contract_number: "AMC-ZEISS-2026-03", asset_id: "MED-IMG-003", contract_type: "AMC", start_date: "2026-08-01", end_date: "2027-07-31", contract_value: 180000, visits_included: 4, pm_visits: 4, breakdown_coverage: true, response_hours: 8, sla_text: "8h response", contact_person: "Anand Pillai", phone: "8040001001", email: "service.in@zeiss.example", status: "active" },
  { id: "amc-alcon", vendor_id: "vnd-alcon", contract_number: "AMC-ALCON-2026-01", asset_id: "MED-OT-003", contract_type: "AMC", start_date: "2025-12-10", end_date: "2026-12-09", contract_value: 210000, visits_included: 12, pm_visits: 12, breakdown_coverage: true, response_hours: 6, sla_text: "Phaco same-day support", contact_person: "Sneha Rao", phone: "8040001002", email: "india.service@alcon.example", status: "active" },
  { id: "amc-alcon-inf", vendor_id: "vnd-alcon", contract_number: "AMC-ALCON-2026-02", asset_id: "MED-OT-004", contract_type: "AMC", start_date: "2026-05-11", end_date: "2026-10-10", contract_value: 95000, visits_included: 6, pm_visits: 6, breakdown_coverage: true, response_hours: 8, sla_text: "Expiring shortly", contact_person: "Sneha Rao", phone: "8040001002", email: "india.service@alcon.example", status: "active" },
  { id: "amc-topcon", vendor_id: "vnd-topcon", contract_number: "AMC-TOP-2026-01", asset_id: "MED-OPD-001", contract_type: "AMC", start_date: "2026-01-12", end_date: "2027-01-11", contract_value: 72000, visits_included: 4, pm_visits: 4, breakdown_coverage: true, response_hours: 24, sla_text: "24h", contact_person: "Imran Khan", phone: "8040001003", email: "service@topcon.example", status: "active" },
  { id: "amc-jci", vendor_id: "vnd-jci", contract_number: "AMC-JCI-HVAC-2026", asset_id: "HVAC-CH-001", contract_type: "AMC", start_date: "2026-01-15", end_date: "2026-10-14", contract_value: 480000, visits_included: 12, pm_visits: 12, breakdown_coverage: true, response_hours: 4, sla_text: "Chiller 4h emergency", contact_person: "Prakash N", phone: "8040001004", email: "hvac@jci.example", status: "active" },
  { id: "cmc-numeric", vendor_id: "vnd-numeric", contract_number: "CMC-NUM-UPS-2026", asset_id: "ELE-UPS-001", contract_type: "CMC", start_date: "2026-03-08", end_date: "2027-03-07", contract_value: 165000, visits_included: 4, pm_visits: 4, breakdown_coverage: true, response_hours: 4, sla_text: "4h UPS emergency", contact_person: "Ajay Bhat", phone: "8040001008", email: "ups@numeric.example", status: "active" },
  { id: "amc-koel", vendor_id: "vnd-kirloskar", contract_number: "AMC-KOEL-DG-2026", asset_id: "ELE-DG-001", contract_type: "AMC", start_date: "2026-01-01", end_date: "2026-12-31", contract_value: 125000, visits_included: 12, pm_visits: 12, breakdown_coverage: true, response_hours: 6, sla_text: "DG 6h", contact_person: "Manoj Patil", phone: "8040001006", email: "dg@koel.example", status: "active" },
  { id: "amc-fire", vendor_id: "vnd-firepro", contract_number: "AMC-FIRE-2026", asset_id: "FIR-ALM-001", contract_type: "AMC", start_date: "2026-07-01", end_date: "2027-06-30", contract_value: 96000, visits_included: 12, pm_visits: 12, breakdown_coverage: true, response_hours: 4, sla_text: "Fire system 4h", contact_person: "Sunil Shetty", phone: "8040001009", email: "ops@firepro.example", status: "active" },
  { id: "amc-aqua", vendor_id: "vnd-aqua", contract_number: "AMC-RO-2026", asset_id: "PLB-RO-001", contract_type: "AMC", start_date: "2026-01-01", end_date: "2026-09-30", contract_value: 54000, visits_included: 12, pm_visits: 12, breakdown_coverage: true, response_hours: 8, sla_text: "RO plant", contact_person: "Bindu Raj", phone: "8040001010", email: "ro@aquapure.example", status: "active" },
  { id: "amc-voltas", vendor_id: "vnd-voltas", contract_number: "AMC-VRF-2026", asset_id: "HVAC-VRF-001", contract_type: "AMC", start_date: "2026-10-01", end_date: "2027-09-30", contract_value: 88000, visits_included: 4, pm_visits: 4, breakdown_coverage: true, response_hours: 8, sla_text: "Starts next month", contact_person: "Rekha Iyer", phone: "8040001007", email: "chiller@voltas.example", status: "scheduled" },
];

const checklists = [
  { id: "cl-pm-med", name: "Medical equipment PM", kind: "pm" },
  { id: "cl-pm-ele", name: "Electrical PM", kind: "pm" },
  { id: "cl-pm-hvac", name: "HVAC PM", kind: "pm" },
  { id: "cl-pm-dg", name: "DG PM", kind: "pm" },
  { id: "cl-round-eng", name: "Engineering morning round", kind: "inspection" },
  { id: "cl-round-fire", name: "Fire safety round", kind: "inspection" },
  { id: "cl-round-ot", name: "OT environment round", kind: "inspection" },
  { id: "cl-round-hk", name: "Housekeeping inspection", kind: "inspection" },
];

const checklist_items = [
  ["cl-pm-med", "Visual inspection and cleanliness", 1],
  ["cl-pm-med", "Power and earth continuity", 2],
  ["cl-pm-med", "Functional test", 3],
  ["cl-pm-med", "Calibration / optics check", 4],
  ["cl-pm-med", "Safety interlocks", 5],
  ["cl-pm-ele", "Incoming voltage", 1, true, "V"],
  ["cl-pm-ele", "Load current", 2, true, "A"],
  ["cl-pm-ele", "Panel tightness / heat", 3],
  ["cl-pm-ele", "Earthing resistance", 4, true, "Ω"],
  ["cl-pm-hvac", "Filter condition", 1],
  ["cl-pm-hvac", "Supply temperature", 2, true, "°C"],
  ["cl-pm-hvac", "Differential pressure", 3, true, "Pa"],
  ["cl-pm-hvac", "Drain and belt", 4],
  ["cl-pm-dg", "Fuel level", 1, true, "%"],
  ["cl-pm-dg", "Oil pressure", 2, true, "bar"],
  ["cl-pm-dg", "Battery voltage", 3, true, "V"],
  ["cl-pm-dg", "Test run 10 minutes", 4],
  ["cl-round-eng", "DG ready", 1],
  ["cl-round-eng", "UPS alarm-free", 2],
  ["cl-round-eng", "AHU running", 3],
  ["cl-round-eng", "No water leak", 4],
  ["cl-round-eng", "Plant room access clear", 5],
  ["cl-round-fire", "Extinguishers in place", 1],
  ["cl-round-fire", "Exits unobstructed", 2],
  ["cl-round-fire", "Panel healthy", 3],
  ["cl-round-fire", "Hydrant valves capped", 4],
  ["cl-round-ot", "OT temperature 18–22°C", 1, true, "°C"],
  ["cl-round-ot", "Humidity 40–60%", 2, true, "%"],
  ["cl-round-ot", "Positive pressure", 3],
  ["cl-round-ot", "AHU HEPA ok", 4],
  ["cl-round-hk", "Floor dry and clear", 1],
  ["cl-round-hk", "Toilets stocked", 2],
  ["cl-round-hk", "Waste segregation", 3],
  ["cl-round-hk", "OT terminal clean", 4],
].map(([checklist_id, label, sort_order, require_reading = false, unit = null], i) => ({
  id: `cli-${i + 1}`, checklist_id, label, sort_order, require_reading, unit,
}));

const pm_plans = assets
  .filter((a) => a.maintenance_frequency)
  .map((a, i) => ({
    id: `pmp-${i + 1}`,
    asset_id: a.id,
    frequency: a.maintenance_frequency,
    checklist_id: a.category_id.startsWith("cat-med")
      ? "cl-pm-med"
      : a.sub_category === "DG"
        ? "cl-pm-dg"
        : a.category_id === "cat-hvac"
          ? "cl-pm-hvac"
          : "cl-pm-ele",
    next_due: a.next_maintenance,
  }));

const pm_records = [];
function addPm(asset_code, scheduled, status, tech, actual = null, extra = {}) {
  const n = pm_records.length + 1;
  pm_records.push({
    id: `pm-${n}`,
    pm_number: `PM-2026-${String(n).padStart(5, "0")}`,
    asset_id: asset_code,
    checklist_id: extra.checklist_id ?? "cl-pm-med",
    scheduled_date: scheduled,
    technician_id: tech,
    actual_date: actual,
    status,
    observations: extra.observations ?? null,
    lubrication: extra.lubrication ?? false,
    cleaning: extra.cleaning ?? true,
    testing: extra.testing ?? true,
    calibration: extra.calibration ?? false,
    safety_checks: extra.safety_checks ?? true,
    remarks: extra.remarks ?? null,
    supervisor_id: extra.supervisor_id ?? "stf-anita",
    cost: extra.cost ?? 0,
  });
}

addPm("MED-OT-001", "2026-09-05", "completed", "stf-meera", "2026-09-05", { calibration: true, remarks: "Illumination 92k lux. Optics cleaned.", cost: 0, supervisor_id: "stf-arjun" });
addPm("MED-OT-003", "2026-09-02", "completed", "stf-meera", "2026-09-02", { remarks: "Handpiece seals ok.", cost: 0 });
addPm("MED-OT-006", "2026-09-10", "completed", "stf-anita", "2026-09-10", { checklist_id: "cl-pm-ele", remarks: "Cycle test passed." });
addPm("ELE-DG-001", "2026-09-12", "completed", "stf-ravi", "2026-09-12", { checklist_id: "cl-pm-dg", lubrication: true, remarks: "Load test 40% 15 min." });
addPm("ELE-DG-002", "2026-09-12", "completed", "stf-ravi", "2026-09-12", { checklist_id: "cl-pm-dg" });
addPm("HVAC-CH-001", "2026-09-06", "completed", "stf-sanjay", "2026-09-06", { checklist_id: "cl-pm-hvac", remarks: "Condenser washed." });
addPm("HVAC-AHU-001", "2026-09-14", "completed", "stf-sanjay", "2026-09-14", { checklist_id: "cl-pm-hvac", remarks: "Pre-filter replaced." });
addPm("HVAC-AHU-002", "2026-09-14", "completed", "stf-sanjay", "2026-09-14", { checklist_id: "cl-pm-hvac" });
addPm("PLB-RO-001", "2026-09-07", "completed", "stf-rahul", "2026-09-07", { checklist_id: "cl-pm-ele", remarks: "TDS 42 ppm." });
addPm("FIR-ALM-001", "2026-09-02", "completed", "stf-farhan", "2026-09-02", { checklist_id: "cl-pm-ele" });
addPm("FIR-PMP-001", "2026-09-02", "completed", "stf-farhan", "2026-09-02", { checklist_id: "cl-pm-dg", lubrication: true });
addPm("MED-IMG-003", "2026-09-01", "completed", "stf-meera", "2026-09-01", { calibration: true });
addPm("ELE-LGT-001", "2026-09-01", "completed", "stf-ravi", "2026-09-01", { checklist_id: "cl-pm-ele" });
addPm("MED-OT-012", "2026-09-20", "overdue", "stf-anita", null, { checklist_id: "cl-pm-ele", remarks: null, supervisor_id: null });
addPm("FIR-SPR-001", "2026-09-10", "overdue", "stf-farhan", null, { checklist_id: "cl-pm-ele", supervisor_id: null });
addPm("FIR-SMK-001", "2026-09-10", "overdue", "stf-farhan", null, { checklist_id: "cl-pm-ele", supervisor_id: null });
addPm("PLB-HW-001", "2026-09-12", "overdue", "stf-rahul", null, { checklist_id: "cl-pm-ele", supervisor_id: null });
addPm("MED-IPD-001", "2026-09-15", "overdue", "stf-meera", null, { supervisor_id: null });
addPm("MED-OT-001", TODAY, "due", "stf-meera", null, { supervisor_id: null });
addPm("HVAC-AHU-001", TODAY, "due", "stf-sanjay", null, { checklist_id: "cl-pm-hvac", supervisor_id: null });
addPm("ELE-UPS-001", TODAY, "due", "stf-ravi", null, { checklist_id: "cl-pm-ele", supervisor_id: null });
addPm("PLB-PMP-001", TODAY, "due", "stf-rahul", null, { checklist_id: "cl-pm-ele", supervisor_id: null });
addPm("MED-OT-003", "2026-10-02", "scheduled", "stf-meera", null, { supervisor_id: null });
addPm("ELE-DG-001", "2026-10-12", "scheduled", "stf-ravi", null, { checklist_id: "cl-pm-dg", supervisor_id: null });
addPm("HVAC-CH-001", "2026-10-06", "scheduled", "stf-sanjay", null, { checklist_id: "cl-pm-hvac", supervisor_id: null });
addPm("MED-IMG-001", "2026-11-22", "scheduled", "stf-meera", null, { supervisor_id: null });
addPm("MED-OT-011", "2026-10-02", "scheduled", "stf-anita", null, { supervisor_id: null });

const breakdowns = [];
function bd(row) {
  const n = breakdowns.length + 1;
  breakdowns.push({
    id: `bd-${n}`,
    ticket_number: `BD-2026-${String(n).padStart(5, "0")}`,
    category: "medical_equipment",
    priority: "medium",
    criticality: "medium",
    status: "open",
    cost: 0,
    external_service: false,
    ...row,
  });
}

bd({ reported_at: ts(-2, 7, 40), reported_by_staff_id: "stf-leela", department_id: "dept-ot", location_id: "loc-ot1", asset_id: "MED-OT-001", description: "Microscope light not working. OT-1 cataract list delayed.", photo_data: null, priority: "high", criticality: "critical", status: "in_progress", assigned_engineer_id: "stf-meera", assigned_technician_id: "stf-rahul", vendor_id: "vnd-zeiss", start_time: ts(-2, 7, 55), responded_at: ts(-2, 7, 55), repair_start: ts(-2, 8, 20), downtime_minutes: null, response_minutes: 15, root_cause: "Halogen/LED illuminator board intermittent", remarks: "Waiting on spare lamp module from Zeiss.", category: "medical_equipment" });
bd({ reported_at: ts(-6, 14, 10), reported_by_staff_id: "stf-leela", department_id: "dept-cssd", location_id: "loc-cssd", asset_id: "MED-OT-006", description: "Autoclave cycle aborting at 121°C. Door gasket leak suspected.", priority: "high", criticality: "high", status: "resolved", assigned_engineer_id: "stf-anita", assigned_technician_id: "stf-deepa", start_time: ts(-6, 14, 25), responded_at: ts(-6, 14, 25), repair_start: ts(-6, 15, 0), completion_time: ts(-6, 17, 40), downtime_minutes: 210, response_minutes: 15, resolution_minutes: 210, root_cause: "Worn door gasket", corrective_action: "Gasket replaced, Bowie-Dick pass", cost: 8400, closure_approved_by: "stf-kavitha", category: "medical_equipment" });
bd({ reported_at: ts(-1, 11, 5), reported_by_staff_id: "stf-arjun", department_id: "dept-eng", location_id: "loc-elec", asset_id: "ELE-UPS-001", description: "Numeric 80 kVA UPS on battery with input fail alarm during BESCOM flicker.", priority: "critical", criticality: "critical", status: "open", assigned_engineer_id: "stf-ravi", assigned_technician_id: "stf-rahul", vendor_id: "vnd-numeric", start_time: ts(-1, 11, 12), responded_at: ts(-1, 11, 12), response_minutes: 7, category: "electrical" });
bd({ reported_at: ts(-11, 9, 20), reported_by_staff_id: "stf-sanjay", department_id: "dept-opd", location_id: "loc-opdhall", asset_id: "HVAC-VRF-001", description: "OPD VRF indoor units not cooling. Outdoor unit icing.", priority: "high", criticality: "high", status: "closed", assigned_engineer_id: "stf-sanjay", assigned_technician_id: "stf-deepa", vendor_id: "vnd-voltas", start_time: ts(-11, 9, 40), responded_at: ts(-11, 9, 40), repair_start: ts(-11, 10, 15), completion_time: ts(-11, 13, 20), downtime_minutes: 200, response_minutes: 20, resolution_minutes: 240, root_cause: "Low refrigerant + dirty coil", corrective_action: "Recovered, leak repaired, recharged R410A, coil washed", cost: 18500, closure_approved_by: "stf-kavitha", category: "hvac" });
bd({ reported_at: ts(-14, 16, 45), reported_by_staff_id: "stf-nisha", department_id: "dept-eng", location_id: "loc-plant", asset_id: "PLB-PMP-001", description: "Hydro-pneumatic pump 2 tripping on overload. Low pressure on floor 3.", priority: "high", criticality: "high", status: "closed", assigned_engineer_id: "stf-anita", assigned_technician_id: "stf-rahul", start_time: ts(-14, 17, 0), responded_at: ts(-14, 17, 0), repair_start: ts(-14, 17, 20), completion_time: ts(-14, 19, 10), downtime_minutes: 145, response_minutes: 15, resolution_minutes: 145, root_cause: "Seized motor bearing", corrective_action: "Motor replaced from inventory", cost: 12600, closure_approved_by: "stf-arjun", category: "plumbing" });
bd({ reported_at: ts(0, 6, 15), reported_by_staff_id: "stf-leela", department_id: "dept-ot", location_id: "loc-ot1", asset_id: "MED-OT-012", description: "OT-1 lights flickering on satellite dome. List starts 08:00.", priority: "critical", criticality: "critical", status: "assigned", assigned_engineer_id: "stf-anita", assigned_technician_id: "stf-rahul", start_time: ts(0, 6, 28), responded_at: ts(0, 6, 28), response_minutes: 13, category: "medical_equipment" });
bd({ reported_at: ts(-3, 13, 0), reported_by_staff_id: "stf-meera", department_id: "dept-img", location_id: "loc-img", asset_id: "MED-IMG-001", description: "OCT software freeze after capture. Reboot recovers.", priority: "medium", criticality: "high", status: "pending_vendor", assigned_engineer_id: "stf-meera", vendor_id: "vnd-zeiss", start_time: ts(-3, 13, 20), responded_at: ts(-3, 13, 20), response_minutes: 20, external_service: true, remarks: "Zeiss remote session booked.", category: "medical_equipment" });
bd({ reported_at: ts(-8, 10, 5), reported_by_staff_id: "stf-deepa", department_id: "dept-eng", location_id: "loc-terrace", asset_id: "HVAC-CH-001", description: "Chiller high-pressure trip. Ambient 34°C.", priority: "high", criticality: "critical", status: "closed", assigned_engineer_id: "stf-sanjay", assigned_technician_id: "stf-deepa", vendor_id: "vnd-jci", start_time: ts(-8, 10, 20), responded_at: ts(-8, 10, 20), repair_start: ts(-8, 10, 40), completion_time: ts(-8, 14, 0), downtime_minutes: 220, response_minutes: 15, resolution_minutes: 235, root_cause: "Blocked condenser coil + fan contactor pitting", corrective_action: "Coil jet-washed, contactor replaced", cost: 27400, closure_approved_by: "stf-kavitha", category: "hvac" });
bd({ reported_at: ts(-20, 8, 50), reported_by_staff_id: "stf-ravi", department_id: "dept-eng", location_id: "loc-terrace", asset_id: "ELE-DG-001", description: "DG failed to auto-start on power cut. AMF not issuing start.", priority: "critical", criticality: "critical", status: "closed", assigned_engineer_id: "stf-ravi", assigned_technician_id: "stf-rahul", vendor_id: "vnd-kirloskar", start_time: ts(-20, 9, 5), responded_at: ts(-20, 9, 5), repair_start: ts(-20, 9, 30), completion_time: ts(-20, 10, 20), downtime_minutes: 75, response_minutes: 15, resolution_minutes: 90, root_cause: "AMF start relay coil open", corrective_action: "Relay replaced, weekly auto-test scheduled", cost: 3200, closure_approved_by: "stf-arjun", category: "electrical" });
bd({ reported_at: ts(-4, 15, 30), reported_by_staff_id: "stf-nisha", department_id: "dept-opd", location_id: "loc-opd1", asset_id: null, description: "OPD-1 AC drain overflowing into consulting room.", priority: "medium", criticality: "medium", status: "in_progress", assigned_engineer_id: "stf-sanjay", assigned_technician_id: "stf-deepa", start_time: ts(-4, 15, 50), responded_at: ts(-4, 15, 50), response_minutes: 20, category: "hvac" });
bd({ reported_at: ts(-9, 12, 0), reported_by_staff_id: "stf-leela", department_id: "dept-ot", location_id: "loc-ot2", asset_id: "MED-OT-004", description: "Phaco machine footpedal intermittent. Surgeon switched to OT-1.", priority: "high", criticality: "high", status: "closed", assigned_engineer_id: "stf-meera", assigned_technician_id: "stf-rahul", vendor_id: "vnd-alcon", start_time: ts(-9, 12, 15), responded_at: ts(-9, 12, 15), repair_start: ts(-9, 13, 0), completion_time: ts(-9, 16, 30), downtime_minutes: 255, response_minutes: 15, resolution_minutes: 270, root_cause: "Footpedal cable strain relief failed", corrective_action: "Cable assembly replaced under AMC", cost: 0, external_service: true, closure_approved_by: "stf-kavitha", category: "medical_equipment" });
bd({ reported_at: ts(-18, 19, 10), reported_by_staff_id: "stf-farhan", department_id: "dept-sec", location_id: "loc-lobby", asset_id: "FIR-ALM-001", description: "Fire panel ground fault on loop 2. Smoke detectors in Ward B.", priority: "high", criticality: "high", status: "closed", assigned_engineer_id: "stf-farhan", assigned_technician_id: "stf-deepa", vendor_id: "vnd-firepro", start_time: ts(-18, 19, 25), responded_at: ts(-18, 19, 25), repair_start: ts(-18, 20, 0), completion_time: ts(-18, 21, 10), downtime_minutes: 0, response_minutes: 15, resolution_minutes: 120, root_cause: "Moisture in junction box above Ward B pantry", corrective_action: "Dried, resealed, loop restored", cost: 1500, closure_approved_by: "stf-kavitha", category: "fire_safety" });
bd({ reported_at: ts(-5, 8, 0), reported_by_staff_id: "stf-leela", department_id: "dept-ot", location_id: "loc-ot1", asset_id: "MED-OT-003", description: "Centurion showing 'occlusion' repeatedly. Irrigation checked.", priority: "high", criticality: "critical", status: "verified", assigned_engineer_id: "stf-meera", assigned_technician_id: "stf-rahul", vendor_id: "vnd-alcon", start_time: ts(-5, 8, 10), responded_at: ts(-5, 8, 10), repair_start: ts(-5, 8, 40), completion_time: ts(-5, 10, 5), downtime_minutes: 125, response_minutes: 10, resolution_minutes: 125, root_cause: "Partially blocked cassette port", corrective_action: "Cassette path cleaned, test pack passed", cost: 0, closure_approved_by: "stf-meera", category: "medical_equipment" });
bd({ reported_at: ts(-15, 7, 30), reported_by_staff_id: "stf-kavitha", department_id: "dept-eng", location_id: "loc-plant", asset_id: "PLB-RO-001", description: "RO product TDS 180 ppm. CSSD rejected water.", priority: "high", criticality: "high", status: "closed", assigned_engineer_id: "stf-anita", assigned_technician_id: "stf-rahul", vendor_id: "vnd-aqua", start_time: ts(-15, 7, 50), responded_at: ts(-15, 7, 50), repair_start: ts(-15, 8, 20), completion_time: ts(-15, 9, 20), downtime_minutes: 90, response_minutes: 20, resolution_minutes: 110, root_cause: "Spent RO membranes", corrective_action: "Membranes replaced, TDS 42 ppm", cost: 22000, closure_approved_by: "stf-kavitha", category: "plumbing" });
bd({ reported_at: ts(-7, 18, 40), reported_by_staff_id: "stf-ravi", department_id: "dept-eng", location_id: "loc-elec", asset_id: "ELE-BAT-001", description: "Two UPS batteries swollen. Autonomy down to 8 minutes.", priority: "high", criticality: "high", status: "pending_spares", assigned_engineer_id: "stf-ravi", assigned_technician_id: "stf-rahul", vendor_id: "vnd-numeric", start_time: ts(-7, 19, 0), responded_at: ts(-7, 19, 0), response_minutes: 20, remarks: "32× 100Ah replacement PO raised.", category: "electrical" });
bd({ reported_at: ts(-22, 11, 15), reported_by_staff_id: "stf-leela", department_id: "dept-opd", location_id: "loc-opd3", asset_id: "MED-OPD-003", description: "Haag-Streit joystick stiff, slit lamp table drift.", priority: "low", criticality: "medium", status: "closed", assigned_engineer_id: "stf-meera", assigned_technician_id: "stf-deepa", start_time: ts(-22, 12, 0), responded_at: ts(-22, 12, 0), repair_start: ts(-22, 12, 20), completion_time: ts(-22, 13, 0), downtime_minutes: 60, response_minutes: 45, resolution_minutes: 105, root_cause: "Dry joystick potentiometer", corrective_action: "Cleaned and lubricated, table lock adjusted", cost: 0, closure_approved_by: "stf-meera", category: "medical_equipment" });
bd({ reported_at: ts(-12, 21, 5), reported_by_staff_id: "stf-farhan", department_id: "dept-ipd", location_id: "loc-ward-b", asset_id: null, description: "Water leakage from ceiling in Ward B pantry. Civil stain.", priority: "medium", criticality: "medium", status: "closed", assigned_engineer_id: "stf-anita", assigned_technician_id: "stf-rahul", start_time: ts(-12, 21, 20), responded_at: ts(-12, 21, 20), repair_start: ts(-12, 21, 40), completion_time: ts(-11, 11, 0), downtime_minutes: 0, response_minutes: 15, resolution_minutes: 820, root_cause: "AHU condensate drain choke on floor above", corrective_action: "Drain snaked, tray cleaned, ceiling tile replaced", cost: 2400, closure_approved_by: "stf-kavitha", category: "civil" });
bd({ reported_at: ts(-16, 9, 0), reported_by_staff_id: "stf-sanjay", department_id: "dept-ot", location_id: "loc-ahu", asset_id: "HVAC-AHU-001", description: "OT-1 differential pressure dropped to 2 Pa during case.", priority: "critical", criticality: "critical", status: "closed", assigned_engineer_id: "stf-sanjay", assigned_technician_id: "stf-deepa", start_time: ts(-16, 9, 8), responded_at: ts(-16, 9, 8), repair_start: ts(-16, 9, 20), completion_time: ts(-16, 10, 10), downtime_minutes: 50, response_minutes: 8, resolution_minutes: 70, root_cause: "Loaded HEPA + VFD at min speed", corrective_action: "HEPA replaced, VFD setpoint restored 15 Pa", cost: 18500, closure_approved_by: "stf-kavitha", category: "hvac" });
bd({ reported_at: ts(-25, 14, 20), reported_by_staff_id: "stf-leela", department_id: "dept-ot", location_id: "loc-ot1", asset_id: "MED-OT-001", description: "Microscope XY coupling sluggish.", priority: "medium", criticality: "high", status: "closed", assigned_engineer_id: "stf-meera", assigned_technician_id: "stf-rahul", vendor_id: "vnd-zeiss", start_time: ts(-25, 15, 0), responded_at: ts(-25, 15, 0), repair_start: ts(-25, 15, 30), completion_time: ts(-25, 17, 0), downtime_minutes: 150, response_minutes: 40, resolution_minutes: 160, root_cause: "XY clutch dust", corrective_action: "Cleaned under AMC visit", cost: 0, external_service: true, closure_approved_by: "stf-arjun", category: "medical_equipment" });
bd({ reported_at: ts(-2, 20, 15), reported_by_staff_id: "stf-nisha", department_id: "dept-hk", location_id: "loc-lobby", asset_id: null, description: "Main lobby washroom flush valve stuck open. Water wastage.", priority: "medium", criticality: "low", status: "closed", assigned_engineer_id: "stf-anita", assigned_technician_id: "stf-deepa", start_time: ts(-2, 20, 30), responded_at: ts(-2, 20, 30), repair_start: ts(-2, 20, 40), completion_time: ts(-2, 21, 10), downtime_minutes: 0, response_minutes: 15, resolution_minutes: 55, root_cause: "Failed diaphragm", corrective_action: "Flush valve kit replaced", cost: 850, closure_approved_by: "stf-kavitha", category: "plumbing" });
bd({ reported_at: ts(-28, 10, 0), reported_by_staff_id: "stf-meera", department_id: "dept-ot", location_id: "loc-ot1", asset_id: "MED-OT-008", description: "OT-1 monitor SpO2 probe reading dashes.", priority: "medium", criticality: "high", status: "closed", assigned_engineer_id: "stf-meera", assigned_technician_id: "stf-rahul", start_time: ts(-28, 10, 20), responded_at: ts(-28, 10, 20), repair_start: ts(-28, 10, 30), completion_time: ts(-28, 10, 50), downtime_minutes: 30, response_minutes: 20, resolution_minutes: 50, root_cause: "Failed reusable probe", corrective_action: "Probe replaced from inventory", cost: 4200, closure_approved_by: "stf-meera", category: "medical_equipment" });
bd({ reported_at: ts(0, 8, 5), reported_by_staff_id: "stf-leela", department_id: "dept-cssd", location_id: "loc-cssd", asset_id: "HVAC-EX-001", description: "CSSD exhaust noisy, vibration on canopy.", priority: "low", criticality: "medium", status: "open", assigned_engineer_id: "stf-sanjay", assigned_technician_id: "stf-deepa", category: "hvac" });
bd({ reported_at: ts(-13, 16, 0), reported_by_staff_id: "stf-ravi", department_id: "dept-eng", location_id: "loc-elec", asset_id: "ELE-PNL-001", description: "Main LT incomer ACB showing 48°C at 62% load. Thermography follow-up.", priority: "medium", criticality: "high", status: "closed", assigned_engineer_id: "stf-ravi", assigned_technician_id: "stf-rahul", start_time: ts(-13, 16, 20), responded_at: ts(-13, 16, 20), repair_start: ts(-13, 17, 0), completion_time: ts(-13, 18, 0), downtime_minutes: 0, response_minutes: 20, resolution_minutes: 120, root_cause: "Loose incoming lug", corrective_action: "Torque to spec, IR scan after 2h load < 38°C", cost: 0, closure_approved_by: "stf-arjun", category: "electrical" });
bd({ reported_at: ts(-19, 7, 45), reported_by_staff_id: "stf-leela", department_id: "dept-ot", location_id: "loc-ot1", asset_id: "MED-OT-001", description: "Repeat: microscope light dim after 20 minutes. Same as earlier event.", priority: "high", criticality: "critical", status: "closed", assigned_engineer_id: "stf-meera", assigned_technician_id: "stf-rahul", vendor_id: "vnd-zeiss", start_time: ts(-19, 8, 0), responded_at: ts(-19, 8, 0), repair_start: ts(-19, 8, 30), completion_time: ts(-19, 9, 40), downtime_minutes: 115, response_minutes: 15, resolution_minutes: 115, root_cause: "Failing illuminator driver — temporary lamp swap", corrective_action: "Temporary lamp; driver ordered (linked to open BD)", cost: 0, closure_approved_by: "stf-arjun", category: "medical_equipment" });

const work_orders = [
  { id: "wo-1", wo_number: "WO-2026-00001", requester_id: "stf-leela", department_id: "dept-ot", asset_id: "MED-OT-001", location_id: "loc-ot1", problem: "Replace microscope illuminator driver under AMC", priority: "high", status: "in_progress", technician_id: "stf-rahul", vendor_id: "vnd-zeiss", planned_date: TODAY, actual_start: ts(-2, 8, 20), labour_hours: 3, cost: 0, source_type: "breakdown", source_id: "bd-1" },
  { id: "wo-2", wo_number: "WO-2026-00002", requester_id: "stf-kavitha", department_id: "dept-eng", asset_id: "ELE-BAT-001", location_id: "loc-elec", problem: "Replace swollen UPS batteries (32 nos)", priority: "high", status: "approved", technician_id: "stf-ravi", vendor_id: "vnd-numeric", planned_date: "2026-09-24", labour_hours: null, cost: 0, source_type: "breakdown", source_id: "bd-15" },
  { id: "wo-3", wo_number: "WO-2026-00003", requester_id: "stf-nisha", department_id: "dept-hk", asset_id: null, location_id: "loc-lobby", problem: "Deep clean lobby after monsoon stains", priority: "low", status: "assigned", technician_id: "stf-nisha", planned_date: "2026-09-23", cost: 0, source_type: "request" },
  { id: "wo-4", wo_number: "WO-2026-00004", requester_id: "stf-sanjay", department_id: "dept-eng", asset_id: "HVAC-CH-001", location_id: "loc-terrace", problem: "Quarterly chiller chemical descaling", priority: "medium", status: "completed", technician_id: "stf-sanjay", vendor_id: "vnd-jci", planned_date: "2026-09-06", actual_start: ts(-16, 10, 0), actual_completion: ts(-16, 16, 0), labour_hours: 6, cost: 18000, source_type: "pm" },
  { id: "wo-5", wo_number: "WO-2026-00005", requester_id: "stf-arjun", department_id: "dept-eng", asset_id: "ELE-PNL-001", location_id: "loc-elec", problem: "Infrared thermography of main LT and OT MCC", priority: "medium", status: "verified", technician_id: "stf-ravi", planned_date: "2026-09-09", actual_start: ts(-13, 16, 20), actual_completion: ts(-13, 18, 0), labour_hours: 2, cost: 0, source_type: "inspection" },
  { id: "wo-6", wo_number: "WO-2026-00006", requester_id: "stf-leela", department_id: "dept-ot", asset_id: "MED-OT-006", location_id: "loc-cssd", problem: "Replace autoclave door gasket", priority: "high", status: "closed", technician_id: "stf-deepa", planned_date: "2026-09-16", actual_start: ts(-6, 15, 0), actual_completion: ts(-6, 17, 40), labour_hours: 2.5, cost: 8400, source_type: "breakdown", source_id: "bd-2" },
  { id: "wo-7", wo_number: "WO-2026-00007", requester_id: "stf-farhan", department_id: "dept-sec", asset_id: "FIR-EXT-002", location_id: "loc-opdhall", problem: "Annual extinguisher hydrotest batch 2", priority: "medium", status: "requested", technician_id: "stf-farhan", vendor_id: "vnd-firepro", planned_date: "2026-09-30", cost: 0, source_type: "compliance" },
  { id: "wo-8", wo_number: "WO-2026-00008", requester_id: "stf-meera", department_id: "dept-img", asset_id: "MED-IMG-001", location_id: "loc-img", problem: "Zeiss remote diagnostics for OCT freeze", priority: "medium", status: "on_hold", technician_id: "stf-meera", vendor_id: "vnd-zeiss", planned_date: TODAY, cost: 0, source_type: "breakdown", source_id: "bd-7", remarks: "Waiting vendor slot" },
  { id: "wo-9", wo_number: "WO-2026-00009", requester_id: "stf-kavitha", department_id: "dept-eng", asset_id: "PLB-HW-001", location_id: "loc-plant", problem: "Heat pump not reaching 55°C — investigate", priority: "medium", status: "assigned", technician_id: "stf-rahul", planned_date: TODAY, cost: 0, source_type: "pm" },
  { id: "wo-10", wo_number: "WO-2026-00010", requester_id: "stf-leela", department_id: "dept-ot", asset_id: "HVAC-AHU-001", location_id: "loc-ahu", problem: "Replace OT-1 HEPA (already done — closeout)", priority: "high", status: "closed", technician_id: "stf-sanjay", planned_date: "2026-09-06", actual_start: ts(-16, 9, 20), actual_completion: ts(-16, 10, 10), labour_hours: 1, cost: 18500, source_type: "breakdown", source_id: "bd-18" },
  { id: "wo-11", wo_number: "WO-2026-00011", requester_id: "stf-anita", department_id: "dept-eng", asset_id: "ELE-LGT-001", location_id: "loc-lobby", problem: "Replace 4 failed emergency luminaires in stairwell", priority: "high", status: "in_progress", technician_id: "stf-deepa", planned_date: TODAY, actual_start: ts(0, 9, 0), labour_hours: 1, cost: 0, source_type: "inspection" },
  { id: "wo-12", wo_number: "WO-2026-00012", requester_id: "stf-vikram", department_id: "dept-admin", asset_id: null, location_id: "loc-admin", problem: "Install additional exam light in consulting 3", priority: "low", status: "requested", planned_date: "2026-10-05", cost: 0, source_type: "request" },
];

const spares = [
  { id: "sp-1", name: "OT microscope LED illuminator board", part_number: "ZE-L700-IL", category: "Biomedical", compatible_asset_id: "MED-OT-001", min_stock: 1, max_stock: 2, current_stock: 0, location: "BM store", supplier_id: "vnd-zeiss", unit_cost: 42000, unit: "pcs" },
  { id: "sp-2", name: "Autoclave door gasket 3870", part_number: "TT-3870-GSK", category: "Biomedical", compatible_asset_id: "MED-OT-006", min_stock: 1, max_stock: 3, current_stock: 1, location: "BM store", supplier_id: "vnd-local", unit_cost: 8400, unit: "pcs" },
  { id: "sp-3", name: "Exide 12V 100Ah SMF battery", part_number: "EX-100-SMF", category: "Electrical", compatible_asset_id: "ELE-BAT-001", min_stock: 4, max_stock: 32, current_stock: 2, location: "Electrical store", supplier_id: "vnd-numeric", unit_cost: 9800, unit: "pcs" },
  { id: "sp-4", name: "AHU pre-filter 600x600x50", part_number: "FLT-PRE-600", category: "HVAC", compatible_asset_id: "HVAC-AHU-001", min_stock: 8, max_stock: 24, current_stock: 10, location: "HVAC store", supplier_id: "vnd-jci", unit_cost: 650, unit: "pcs" },
  { id: "sp-5", name: "HEPA 610x610x292 H13", part_number: "HEP-H13-610", category: "HVAC", compatible_asset_id: "HVAC-AHU-001", min_stock: 2, max_stock: 6, current_stock: 1, location: "HVAC store", supplier_id: "vnd-jci", unit_cost: 18500, unit: "pcs" },
  { id: "sp-6", name: "R410A refrigerant 11kg", part_number: "R410A-11", category: "HVAC", min_stock: 2, max_stock: 6, current_stock: 3, location: "HVAC store", supplier_id: "vnd-voltas", unit_cost: 4200, unit: "cyl" },
  { id: "sp-7", name: "Grundfos CME motor 1.5kW", part_number: "GF-CME-M15", category: "Plumbing", compatible_asset_id: "PLB-PMP-001", min_stock: 1, max_stock: 2, current_stock: 0, location: "Pump store", supplier_id: "vnd-aqua", unit_cost: 12600, unit: "pcs" },
  { id: "sp-8", name: "RO membrane 4040", part_number: "ROM-4040", category: "Plumbing", compatible_asset_id: "PLB-RO-001", min_stock: 2, max_stock: 8, current_stock: 4, location: "RO store", supplier_id: "vnd-aqua", unit_cost: 5500, unit: "pcs" },
  { id: "sp-9", name: "Flush valve diaphragm kit", part_number: "FV-DIA-01", category: "Plumbing", min_stock: 6, max_stock: 20, current_stock: 11, location: "Plumbing store", supplier_id: "vnd-aqua", unit_cost: 180, unit: "pcs" },
  { id: "sp-10", name: "Mindray SpO2 reusable probe", part_number: "MR-SPO2-R", category: "Biomedical", compatible_asset_id: "MED-OT-008", min_stock: 2, max_stock: 6, current_stock: 3, location: "BM store", supplier_id: "vnd-local", unit_cost: 4200, unit: "pcs" },
  { id: "sp-11", name: "AMF start relay 24V", part_number: "AMF-RLY-24", category: "Electrical", compatible_asset_id: "ELE-DG-001", min_stock: 2, max_stock: 6, current_stock: 4, location: "Electrical store", supplier_id: "vnd-kirloskar", unit_cost: 850, unit: "pcs" },
  { id: "sp-12", name: "Chiller fan contactor 40A", part_number: "LC1D40", category: "HVAC", compatible_asset_id: "HVAC-CH-001", min_stock: 2, max_stock: 6, current_stock: 3, location: "HVAC store", supplier_id: "vnd-jci", unit_cost: 2100, unit: "pcs" },
  { id: "sp-13", name: "Emergency luminaire 3W", part_number: "EL-3W-LED", category: "Electrical", compatible_asset_id: "ELE-LGT-001", min_stock: 6, max_stock: 20, current_stock: 5, location: "Electrical store", supplier_id: "vnd-schneider", unit_cost: 980, unit: "pcs" },
  { id: "sp-14", name: "Phaco cassette pack (box 6)", part_number: "AL-CAS-6", category: "Biomedical", compatible_asset_id: "MED-OT-003", min_stock: 4, max_stock: 12, current_stock: 7, location: "OT store", supplier_id: "vnd-alcon", unit_cost: 9800, unit: "box" },
  { id: "sp-15", name: "Diesel  (drum equivalent)", part_number: "HSD-L", category: "Fuel", compatible_asset_id: "ELE-DG-001", min_stock: 400, max_stock: 2000, current_stock: 820, location: "DG day tank", supplier_id: "vnd-kirloskar", unit_cost: 94, unit: "L" },
  { id: "sp-16", name: "Fire pump packing set", part_number: "FP-PACK", category: "Fire", compatible_asset_id: "FIR-PMP-001", min_stock: 1, max_stock: 3, current_stock: 2, location: "Fire store", supplier_id: "vnd-firepro", unit_cost: 1400, unit: "set" },
  { id: "sp-17", name: "MCB 32A C-curve", part_number: "A9N2P32", category: "Electrical", min_stock: 10, max_stock: 40, current_stock: 18, location: "Electrical store", supplier_id: "vnd-schneider", unit_cost: 420, unit: "pcs" },
  { id: "sp-18", name: "AHU belt A-46", part_number: "BLT-A46", category: "HVAC", min_stock: 4, max_stock: 12, current_stock: 6, location: "HVAC store", supplier_id: "vnd-jci", unit_cost: 180, unit: "pcs" },
  { id: "sp-19", name: "Suction jar liner", part_number: "MED-JAR-L", category: "Biomedical", compatible_asset_id: "MED-OT-013", min_stock: 20, max_stock: 80, current_stock: 44, location: "OT store", supplier_id: "vnd-local", unit_cost: 65, unit: "pcs" },
  { id: "sp-20", name: "OT light handle covers", part_number: "OT-HND-CV", category: "Biomedical", compatible_asset_id: "MED-OT-012", min_stock: 50, max_stock: 200, current_stock: 120, location: "OT store", supplier_id: "vnd-local", unit_cost: 12, unit: "pcs" },
  { id: "sp-21", name: "Earthing compound 25kg", part_number: "EAR-25", category: "Electrical", compatible_asset_id: "ELE-EAR-001", min_stock: 2, max_stock: 8, current_stock: 3, location: "Electrical store", supplier_id: "vnd-schneider", unit_cost: 1100, unit: "bag" },
  { id: "sp-22", name: "ABC 6kg refill charge", part_number: "ABC-6-R", category: "Fire", compatible_asset_id: "FIR-EXT-002", min_stock: 4, max_stock: 12, current_stock: 4, location: "Fire store", supplier_id: "vnd-firepro", unit_cost: 450, unit: "pcs" },
];

const stock_movements = [
  { id: "sm-1", spare_id: "sp-2", movement_type: "issue", qty: 1, ref_type: "breakdown", ref_id: "bd-2", staff_id: "stf-deepa", unit_cost: 8400, notes: "Autoclave gasket", created_at: ts(-6, 16, 0) },
  { id: "sm-2", spare_id: "sp-7", movement_type: "issue", qty: 1, ref_type: "breakdown", ref_id: "bd-5", staff_id: "stf-rahul", unit_cost: 12600, notes: "Pump motor", created_at: ts(-14, 18, 0) },
  { id: "sm-3", spare_id: "sp-5", movement_type: "issue", qty: 1, ref_type: "breakdown", ref_id: "bd-18", staff_id: "stf-sanjay", unit_cost: 18500, notes: "OT-1 HEPA", created_at: ts(-16, 9, 40) },
  { id: "sm-4", spare_id: "sp-10", movement_type: "issue", qty: 1, ref_type: "breakdown", ref_id: "bd-21", staff_id: "stf-rahul", unit_cost: 4200, created_at: ts(-28, 10, 40) },
  { id: "sm-5", spare_id: "sp-8", movement_type: "issue", qty: 2, ref_type: "breakdown", ref_id: "bd-14", staff_id: "stf-rahul", unit_cost: 5500, created_at: ts(-15, 8, 40) },
  { id: "sm-6", spare_id: "sp-11", movement_type: "issue", qty: 1, ref_type: "breakdown", ref_id: "bd-9", staff_id: "stf-ravi", unit_cost: 850, created_at: ts(-20, 9, 40) },
  { id: "sm-7", spare_id: "sp-12", movement_type: "issue", qty: 1, ref_type: "breakdown", ref_id: "bd-8", staff_id: "stf-sanjay", unit_cost: 2100, created_at: ts(-8, 12, 0) },
  { id: "sm-8", spare_id: "sp-4", movement_type: "issue", qty: 4, ref_type: "pm", ref_id: "pm-7", staff_id: "stf-sanjay", unit_cost: 650, created_at: ts(-8, 11, 0) },
  { id: "sm-9", spare_id: "sp-15", movement_type: "purchase", qty: 400, ref_type: "purchase", staff_id: "stf-ravi", unit_cost: 94, notes: "IOCL bowser", created_at: ts(-4, 10, 0) },
  { id: "sm-10", spare_id: "sp-3", movement_type: "purchase", qty: 2, ref_type: "purchase", staff_id: "stf-ravi", unit_cost: 9800, notes: "Emergency pair pending full bank", created_at: ts(-3, 11, 0) },
];

const breakdown_spares = [
  { id: "bs-1", breakdown_id: "bd-2", spare_id: "sp-2", qty: 1, unit_cost: 8400 },
  { id: "bs-2", breakdown_id: "bd-5", spare_id: "sp-7", qty: 1, unit_cost: 12600 },
  { id: "bs-3", breakdown_id: "bd-18", spare_id: "sp-5", qty: 1, unit_cost: 18500 },
  { id: "bs-4", breakdown_id: "bd-21", spare_id: "sp-10", qty: 1, unit_cost: 4200 },
  { id: "bs-5", breakdown_id: "bd-14", spare_id: "sp-8", qty: 2, unit_cost: 5500 },
  { id: "bs-6", breakdown_id: "bd-9", spare_id: "sp-11", qty: 1, unit_cost: 850 },
  { id: "bs-7", breakdown_id: "bd-8", spare_id: "sp-12", qty: 1, unit_cost: 2100 },
];

const calibrations = [
  { id: "cal-1", asset_id: "MED-OT-001", standard_name: "Illuminance / optical", calibration_date: "2026-06-05", due_date: "2026-12-05", certificate_number: "NABL-ZE-2601", agency: "Zeiss Certified Lab", result: "pass", next_due: "2026-12-05" },
  { id: "cal-2", asset_id: "MED-OT-002", standard_name: "Illuminance / optical", calibration_date: "2026-05-12", due_date: "2026-11-12", certificate_number: "NABL-ZE-2588", agency: "Zeiss Certified Lab", result: "pass", next_due: "2026-11-12" },
  { id: "cal-3", asset_id: "MED-OT-003", standard_name: "Vacuum / flow", calibration_date: "2026-07-02", due_date: "2027-01-02", certificate_number: "AL-CAL-331", agency: "Alcon Service", result: "pass", next_due: "2027-01-02" },
  { id: "cal-4", asset_id: "MED-OT-005", standard_name: "Laser energy", calibration_date: "2026-04-21", due_date: "2026-10-21", certificate_number: "LM-EN-19", agency: "AERB authorised", result: "pass", next_due: "2026-10-21" },
  { id: "cal-5", asset_id: "MED-OT-008", standard_name: "NIBP / SpO2 / ECG", calibration_date: "2026-05-01", due_date: "2026-11-01", certificate_number: "BM-MON-08", agency: "Helios Biomedical", result: "pass", next_due: "2026-11-01" },
  { id: "cal-6", asset_id: "MED-OT-009", standard_name: "NIBP / SpO2 / ECG", calibration_date: "2026-05-01", due_date: "2026-11-01", certificate_number: "BM-MON-09", agency: "Helios Biomedical", result: "pass", next_due: "2026-11-01" },
  { id: "cal-7", asset_id: "MED-IMG-001", standard_name: "OCT axial length", calibration_date: "2026-08-22", due_date: "2027-02-22", certificate_number: "ZE-OCT-5000", agency: "Zeiss", result: "pass", next_due: "2027-02-22" },
  { id: "cal-8", asset_id: "MED-IMG-003", standard_name: "Perimetry luminance", calibration_date: "2026-09-01", due_date: "2027-03-01", certificate_number: "HFA3-CAL-01", agency: "Zeiss", result: "pass", next_due: "2027-03-01" },
  { id: "cal-9", asset_id: "MED-OPD-001", standard_name: "Slit lamp alignment", calibration_date: "2026-02-14", due_date: "2026-08-14", certificate_number: "TP-SL-014", agency: "Topcon", result: "pass", next_due: "2026-08-14" },
  { id: "cal-10", asset_id: "MED-OPD-004", standard_name: "Autoref verification", calibration_date: "2026-04-11", due_date: "2026-10-11", certificate_number: "ND-ARK-11", agency: "Nidek authorised", result: "pass", next_due: "2026-10-11" },
  { id: "cal-11", asset_id: "MED-IPD-001", standard_name: "ECG amplitude", calibration_date: "2026-03-15", due_date: "2026-09-15", certificate_number: "BPL-ECG-15", agency: "BPL Service", result: "pass", next_due: "2026-09-15" },
  { id: "cal-12", asset_id: "MED-OT-010", standard_name: "NIBP / SpO2", calibration_date: "2026-04-18", due_date: "2026-10-18", certificate_number: "GE-B450-18", agency: "GE authorised", result: "pass", next_due: "2026-10-18" },
];

const inspections = [
  { id: "ins-1", round_type: "morning", name: "Engineering morning round", checklist_id: "cl-round-eng", inspector_id: "stf-rahul", scheduled_at: ts(0, 7, 0), completed_at: ts(0, 7, 40), score: 92, status: "completed", notes: "UPS alarm noted — ticket already open." },
  { id: "ins-2", round_type: "ot", name: "OT environment round", checklist_id: "cl-round-ot", inspector_id: "stf-sanjay", scheduled_at: ts(0, 6, 30), completed_at: ts(0, 6, 55), score: 88, status: "completed", notes: "OT-1 lights flickering — BD raised." },
  { id: "ins-3", round_type: "fire", name: "Fire safety round", checklist_id: "cl-round-fire", inspector_id: "stf-farhan", scheduled_at: ts(-1, 10, 0), completed_at: ts(-1, 10, 45), score: 96, status: "completed" },
  { id: "ins-4", round_type: "housekeeping", name: "Housekeeping morning", checklist_id: "cl-round-hk", inspector_id: "stf-nisha", scheduled_at: ts(0, 6, 0), completed_at: ts(0, 6, 50), score: 90, status: "completed" },
  { id: "ins-5", round_type: "evening", name: "Engineering evening round", checklist_id: "cl-round-eng", inspector_id: "stf-deepa", scheduled_at: ts(-1, 18, 0), completed_at: ts(-1, 18, 35), score: 94, status: "completed" },
  { id: "ins-6", round_type: "electrical", name: "Electrical weekly", checklist_id: "cl-round-eng", inspector_id: "stf-ravi", scheduled_at: ts(-3, 11, 0), completed_at: ts(-3, 12, 10), score: 85, status: "completed", notes: "Battery bank autonomy concern." },
  { id: "ins-7", round_type: "hvac", name: "HVAC weekly", checklist_id: "cl-round-ot", inspector_id: "stf-sanjay", scheduled_at: ts(-4, 9, 0), completed_at: ts(-4, 10, 20), score: 91, status: "completed" },
  { id: "ins-8", round_type: "night", name: "Night engineering round", checklist_id: "cl-round-eng", inspector_id: "stf-rahul", scheduled_at: ts(-1, 22, 0), completed_at: ts(-1, 22, 30), score: 100, status: "completed" },
  { id: "ins-9", round_type: "fire", name: "Fire safety round", checklist_id: "cl-round-fire", inspector_id: "stf-farhan", scheduled_at: ts(0, 16, 0), status: "scheduled" },
  { id: "ins-10", round_type: "icu", name: "Recovery / ICU round", checklist_id: "cl-round-ot", inspector_id: "stf-anita", scheduled_at: ts(0, 11, 0), status: "scheduled" },
  { id: "ins-11", round_type: "housekeeping", name: "OT terminal clean audit", checklist_id: "cl-round-hk", inspector_id: "stf-nisha", scheduled_at: ts(-2, 20, 0), completed_at: ts(-2, 20, 40), score: 97, status: "completed" },
  { id: "ins-12", round_type: "engineering", name: "Plant room weekly", checklist_id: "cl-round-eng", inspector_id: "stf-arjun", scheduled_at: ts(-7, 15, 0), completed_at: ts(-7, 16, 0), score: 80, status: "completed", notes: "Two UPS batteries swollen." },
];

const inspection_results = [
  { id: "ir-1", inspection_id: "ins-2", item_id: "cli-27", label: "OT temperature 18–22°C", result: "pass", observation: "20.4°C" },
  { id: "ir-2", inspection_id: "ins-2", item_id: "cli-28", label: "Humidity 40–60%", result: "pass", observation: "52%" },
  { id: "ir-3", inspection_id: "ins-2", item_id: "cli-29", label: "Positive pressure", result: "pass" },
  { id: "ir-4", inspection_id: "ins-2", item_id: "cli-30", label: "AHU HEPA ok", result: "fail", observation: "OT-1 lights related; AHU ok. Lights flickering.", ticket_id: "bd-6" },
  { id: "ir-5", inspection_id: "ins-1", item_id: "cli-18", label: "DG ready", result: "pass" },
  { id: "ir-6", inspection_id: "ins-1", item_id: "cli-19", label: "UPS alarm-free", result: "fail", observation: "Input fail latch overnight", ticket_id: "bd-3" },
  { id: "ir-7", inspection_id: "ins-1", item_id: "cli-20", label: "AHU running", result: "pass" },
  { id: "ir-8", inspection_id: "ins-1", item_id: "cli-21", label: "No water leak", result: "pass" },
  { id: "ir-9", inspection_id: "ins-3", item_id: "cli-23", label: "Extinguishers in place", result: "pass" },
  { id: "ir-10", inspection_id: "ins-3", item_id: "cli-24", label: "Exits unobstructed", result: "pass" },
  { id: "ir-11", inspection_id: "ins-3", item_id: "cli-25", label: "Panel healthy", result: "pass" },
  { id: "ir-12", inspection_id: "ins-3", item_id: "cli-26", label: "Hydrant valves capped", result: "pass" },
];

const logbook_entries = [];
function addLog(type, asset, loc, by, when, readings, remarks = null) {
  logbook_entries.push({
    id: `lb-${logbook_entries.length + 1}`,
    logbook_type: type,
    asset_id: asset,
    location_id: loc,
    recorded_by: by,
    recorded_at: when,
    readings,
    remarks,
  });
}
for (let d = -6; d <= 0; d++) {
  addLog("dg", "ELE-DG-001", "loc-terrace", "stf-ravi", ts(d, 8, 0), { start_stop: "standby", running_hours: 1840 + d * -0.4, fuel_level_pct: 72 + d, load_kw: 0, voltage: 415, current: 0, frequency: 0, oil_pressure: 0, battery_voltage: 26.4, coolant_temp: 38 }, "Weekly auto-test pending evening");
  addLog("electrical", "ELE-PNL-001", "loc-elec", "stf-ravi", ts(d, 8, 15), { incoming_voltage: 418 - (d % 3), current: 310 + d * 2, load_kw: 198 + d, panel_status: "healthy", dg_status: "auto", ups_status: d === -1 ? "alarm" : "normal", battery_status: d >= -7 && d <= 0 ? "watch" : "ok", transformer_temp: 54 });
  addLog("hvac", "HVAC-AHU-001", "loc-ahu", "stf-sanjay", ts(d, 6, 40), { temperature: 20.2 + (d % 2) * 0.3, humidity: 51, ahu_status: "run", filter_condition: d > -2 ? "ok" : "dirty", dp_pa: 14 + (d % 3), chiller_load_pct: 62, compressor_status: "run" });
  addLog("ro", "PLB-RO-001", "loc-plant", "stf-rahul", ts(d, 7, 10), { tds: 40 + Math.abs(d), ph: 6.8, pressure_bar: 9.2, flow_lph: 920, tank_level_pct: 78, pump_status: "run", consumption_kl: 12.4 + d * -0.2 });
  addLog("ot", "HVAC-AHU-001", "loc-ot1", "stf-sanjay", ts(d, 6, 50), { room_temp: 20.4, humidity: 52, dp_pa: 15, ahu_status: "run", ot_equipment: d === 0 ? "lights flicker" : "ok", cleaning_status: "done" });
}
addLog("medical", "MED-OT-001", "loc-ot1", "stf-meera", ts(0, 7, 20), { equipment_status: "degraded", usage_hours: 4120, daily_inspection: "fail", cleaning: "done", functional_check: "illumination fail", operator_remarks: "Do not use until light board replaced" }, "Linked to BD-2026-00001");
addLog("medical", "MED-OT-003", "loc-ot1", "stf-meera", ts(0, 7, 25), { equipment_status: "ok", usage_hours: 2104, daily_inspection: "pass", cleaning: "done", functional_check: "pass" });
addLog("dg", "ELE-DG-001", "loc-terrace", "stf-ravi", ts(-1, 19, 10), { start_stop: "ran", running_hours: 1841.2, fuel_level_pct: 70, load_kw: 96, voltage: 415, current: 148, frequency: 50.1, oil_pressure: 4.2, battery_voltage: 27.1, coolant_temp: 78 }, "BESCOM outage 38 min");

const utility_readings = [];
for (let d = -29; d <= 0; d++) {
  const day = daysFrom(d);
  const kwh = 1820 + Math.round(80 * Math.sin(d / 3) + (d % 7 === 0 ? -220 : 0));
  const dgkwh = d === -1 || d === -20 ? 90 : 12;
  utility_readings.push({
    id: `ut-e-${d + 30}`,
    utility_type: "electricity",
    recorded_on: day,
    readings: { kwh, dg_kwh: dgkwh, solar_kwh: 140 + (d % 5) * 8, power_factor: 0.97, max_demand_kva: 248 },
    cost: kwh * 9.2,
    recorded_by: "stf-ravi",
  });
  utility_readings.push({
    id: `ut-w-${d + 30}`,
    utility_type: "water",
    recorded_on: day,
    readings: { kl: 38 + (d % 4), tank_level_pct: 70 + (d % 5) * 2, ro_kl: 12.5, borewell_kl: 10, municipal_kl: 18, wastewater_kl: 22 },
    cost: 2100,
    recorded_by: "stf-rahul",
  });
}
utility_readings.push({
  id: "ut-d-1",
  utility_type: "diesel",
  recorded_on: daysFrom(-4),
  readings: { opening_l: 520, purchase_l: 400, consumption_l: 100, closing_l: 820, dg_hours: 1.2, efficiency_lph: 12.5 },
  cost: 37600,
  recorded_by: "stf-ravi",
});
utility_readings.push({
  id: "ut-h-1",
  utility_type: "hvac",
  recorded_on: TODAY,
  readings: { energy_kwh: 740, avg_temp: 22.4, avg_humidity: 54, runtime_hours: 18 },
  cost: 6808,
  recorded_by: "stf-sanjay",
});

const housekeeping_tasks = [
  { id: "hk-1", area: "OT-1", task_type: "ot_cleaning", location_id: "loc-ot1", scheduled_date: TODAY, assigned_to: "stf-nisha", status: "completed", score: 98, completed_at: ts(0, 6, 20) },
  { id: "hk-2", area: "OT-2", task_type: "ot_cleaning", location_id: "loc-ot2", scheduled_date: TODAY, assigned_to: "stf-nisha", status: "completed", score: 97, completed_at: ts(0, 6, 35) },
  { id: "hk-3", area: "Main lobby toilets", task_type: "toilet_inspection", location_id: "loc-lobby", scheduled_date: TODAY, assigned_to: "stf-nisha", status: "in_progress", score: null },
  { id: "hk-4", area: "OPD hall", task_type: "common_area", location_id: "loc-opdhall", scheduled_date: TODAY, assigned_to: "stf-nisha", status: "scheduled" },
  { id: "hk-5", area: "CSSD", task_type: "deep_cleaning", location_id: "loc-cssd", scheduled_date: "2026-09-21", assigned_to: "stf-nisha", status: "completed", score: 94, completed_at: ts(-1, 15, 0) },
  { id: "hk-6", area: "Campus", task_type: "pest_control", location_id: "loc-lobby", scheduled_date: "2026-09-18", assigned_to: "stf-nisha", status: "completed", score: 100, notes: "Monthly pest control — no activity", completed_at: ts(-4, 11, 0) },
  { id: "hk-7", area: "Ward A", task_type: "common_area", location_id: "loc-ward-a", scheduled_date: TODAY, assigned_to: "stf-nisha", status: "scheduled" },
  { id: "hk-8", area: "Biomedical waste", task_type: "waste_management", location_id: "loc-cssd", scheduled_date: TODAY, assigned_to: "stf-nisha", status: "completed", score: 96, completed_at: ts(0, 7, 10) },
  { id: "hk-9", area: "Optical shop", task_type: "common_area", location_id: "loc-opt", scheduled_date: "2026-09-23", assigned_to: "stf-nisha", status: "scheduled" },
  { id: "hk-10", area: "Plant room", task_type: "deep_cleaning", location_id: "loc-plant", scheduled_date: "2026-09-20", assigned_to: "stf-nisha", status: "overdue" },
];

const incidents = [
  { id: "inc-1", incident_number: "INC-2026-00001", incident_type: "equipment_failure", occurred_at: ts(-2, 7, 40), location_id: "loc-ot1", asset_id: "MED-OT-001", description: "Microscope illumination failed as first case was draped. List delayed 40 minutes.", people_involved: "Dr. Leela Nair, OT tech team", immediate_action: "Moved case to OT-2 after timeout.", root_cause: "Illuminator driver", corrective_action: "Work order under AMC", preventive_action: "Weekly functional check of OT-1 microscope before list", status: "open", reported_by: "stf-leela" },
  { id: "inc-2", incident_number: "INC-2026-00002", incident_type: "electrical_incident", occurred_at: ts(-1, 11, 5), location_id: "loc-elec", asset_id: "ELE-UPS-001", description: "UPS transferred to battery during grid flicker; OT did not lose power.", immediate_action: "Confirmed OT UPS islanded correctly.", status: "investigating", reported_by: "stf-ravi" },
  { id: "inc-3", incident_number: "INC-2026-00003", incident_type: "water_leakage", occurred_at: ts(-12, 21, 5), location_id: "loc-ward-b", description: "Ceiling leak in Ward B pantry from AHU drain.", people_involved: "Night sister, housekeeping", immediate_action: "Area isolated, buckets, patients relocated from bay 4.", root_cause: "Choked condensate drain", corrective_action: "Drain cleared", preventive_action: "Monthly drain flush on AHU log", status: "closed", reported_by: "stf-farhan", closed_at: ts(-11, 12, 0) },
  { id: "inc-4", incident_number: "INC-2026-00004", incident_type: "hvac_failure", occurred_at: ts(-16, 9, 0), location_id: "loc-ot1", asset_id: "HVAC-AHU-001", description: "OT-1 lost positive pressure mid-case. Case completed with door discipline.", people_involved: "Surgeon, anaesthetist", immediate_action: "Restricted door openings, HVAC team called.", root_cause: "Loaded HEPA", corrective_action: "HEPA replaced", preventive_action: "DP alarm to engineering WhatsApp → now Sightline alert", status: "closed", reported_by: "stf-leela", closed_at: ts(-16, 16, 0) },
  { id: "inc-5", incident_number: "INC-2026-00005", incident_type: "patient_safety_facility", occurred_at: ts(-16, 9, 0), location_id: "loc-ot1", description: "Same event as INC-2026-00004 recorded for patient-safety review.", status: "closed", reported_by: "stf-vikram", closed_at: ts(-10, 10, 0) },
  { id: "inc-6", incident_number: "INC-2026-00006", incident_type: "property_damage", occurred_at: ts(-12, 21, 5), location_id: "loc-ward-b", description: "Ceiling tile and pantry cabinet water damage.", status: "closed", reported_by: "stf-kavitha", closed_at: ts(-8, 9, 0), corrective_action: "Tile replaced, cabinet dried" },
  { id: "inc-7", incident_number: "INC-2026-00007", incident_type: "fire_incident", occurred_at: ts(-40, 14, 0), location_id: "loc-plant", description: "Smell of burning from STP panel — no flame. Isolated.", immediate_action: "Power isolated, fire team stood down.", root_cause: "Overheated contactor", corrective_action: "Contactor replaced", status: "closed", reported_by: "stf-farhan", closed_at: ts(-39, 18, 0) },
  { id: "inc-8", incident_number: "INC-2026-00008", incident_type: "other", occurred_at: ts(-3, 13, 0), location_id: "loc-img", asset_id: "MED-IMG-001", description: "OCT downtime affecting 6 scheduled patients. Rescheduled.", status: "open", reported_by: "stf-meera" },
];

const rca = [
  { id: "rca-1", breakdown_id: "bd-1", method: "5_why", five_whys: ["Light went out during list", "Illuminator board not supplying LED", "Driver electrolytic aged / heat", "No thermal survey of microscope head", "PM checklist lacked thermal item"], fishbone: { equipment: "Illuminator driver", method: "PM gap", people: "No pre-list function test logged", environment: "OT heat load" }, root_cause: "Ageing illuminator driver not in predictive PM", corrective_action: "Replace driver, add pre-list check", preventive_action: "Add thermal + lux to monthly PM", owner_id: "stf-meera", target_date: "2026-09-30", status: "open" },
  { id: "rca-2", breakdown_id: "bd-8", method: "fishbone", five_whys: ["Chiller tripped on HP", "Condenser dirty + weak fan", "Monsoon dust + deferred wash", "Weekly wash missed twice", "No ownership on terrace checklist"], root_cause: "Missed condenser wash during monsoon", corrective_action: "Coil washed, contactor replaced", preventive_action: "Monsoon weekly condenser wash in HVAC logbook", owner_id: "stf-sanjay", target_date: "2026-09-20", evidence: "Photos of coil before/after", status: "closed" },
  { id: "rca-3", incident_id: "inc-4", method: "5_why", five_whys: ["DP collapsed", "HEPA loaded", "Pre-filter bypassed", "Pre-filter change skipped", "Stock of HEPA at min"], root_cause: "HEPA not changed on DP trend", corrective_action: "HEPA replaced", preventive_action: "DP > 20 Pa auto-ticket", owner_id: "stf-sanjay", target_date: "2026-09-25", status: "closed" },
];

const documents = [
  { id: "doc-1", title: "Zeiss Lumera 700 operator manual", kind: "manual", linked_type: "asset", linked_id: "MED-OT-001", notes: "Digital copy in biomedical cabinet", uploaded_by: "stf-meera" },
  { id: "doc-2", title: "AMC Zeiss 2026-27", kind: "amc", linked_type: "contract", linked_id: "amc-zeiss-ot", uploaded_by: "stf-kavitha" },
  { id: "doc-3", title: "Alcon Centurion AMC", kind: "amc", linked_type: "contract", linked_id: "amc-alcon", uploaded_by: "stf-kavitha" },
  { id: "doc-4", title: "OT HVAC SOP", kind: "sop", linked_type: "department", linked_id: "dept-ot", uploaded_by: "stf-sanjay" },
  { id: "doc-5", title: "Fire NOC 2026", kind: "license", linked_type: "hospital", linked_id: "default", notes: "Expires 2027-03-31", uploaded_by: "stf-farhan" },
  { id: "doc-6", title: "AERB laser registration", kind: "license", linked_type: "asset", linked_id: "MED-OT-005", uploaded_by: "stf-meera" },
  { id: "doc-7", title: "Single line diagram LT", kind: "drawing", linked_type: "asset", linked_id: "ELE-PNL-001", uploaded_by: "stf-ravi" },
  { id: "doc-8", title: "HFA3 calibration certificate", kind: "calibration", linked_type: "asset", linked_id: "MED-IMG-003", uploaded_by: "stf-meera" },
  { id: "doc-9", title: "JCI chiller AMC", kind: "amc", linked_type: "contract", linked_id: "amc-jci", uploaded_by: "stf-kavitha" },
  { id: "doc-10", title: "BMW authorisation", kind: "license", linked_type: "hospital", linked_id: "default", notes: "KSPCB", uploaded_by: "stf-nisha" },
  { id: "doc-11", title: "Kirloskar DG operation manual", kind: "manual", linked_type: "asset", linked_id: "ELE-DG-001", uploaded_by: "stf-ravi" },
  { id: "doc-12", title: "Vendor GST — Zeiss", kind: "vendor", linked_type: "vendor", linked_id: "vnd-zeiss", uploaded_by: "stf-kavitha" },
];

const notifications = [
  { id: "nt-1", staff_id: "stf-kavitha", kind: "critical_breakdown", title: "Critical: OT-1 microscope light", body: "BD-2026-00001 — OT-1 cataract list affected.", ref_type: "breakdown", ref_id: "bd-1" },
  { id: "nt-2", staff_id: "stf-kavitha", kind: "critical_breakdown", title: "OT-1 lights flickering", body: "BD-2026-00006 opened at 06:15.", ref_type: "breakdown", ref_id: "bd-6" },
  { id: "nt-3", staff_id: "stf-meera", kind: "assigned_task", title: "You are assigned BD-2026-00001", body: "Zeiss OPMI Lumera 700 — illuminator.", ref_type: "breakdown", ref_id: "bd-1" },
  { id: "nt-4", staff_id: "stf-rahul", kind: "pm_due", title: "PM due today — hydro pump", body: "PLB-PMP-001 monthly PM.", ref_type: "pm", ref_id: "pm-22" },
  { id: "nt-5", staff_id: "stf-kavitha", kind: "amc_expiry", title: "AMC expiring in 18 days — Alcon Infiniti", body: "AMC-ALCON-2026-02 ends 10 Oct 2026.", ref_type: "contract", ref_id: "amc-alcon-inf" },
  { id: "nt-6", staff_id: "stf-kavitha", kind: "amc_expiry", title: "RO AMC expires 30 Sep", body: "AMC-RO-2026.", ref_type: "contract", ref_id: "amc-aqua" },
  { id: "nt-7", staff_id: "stf-meera", kind: "calibration_expiry", title: "ECG calibration due 15 Sep — overdue", body: "BPL Cardiart 6208.", ref_type: "calibration", ref_id: "cal-11" },
  { id: "nt-8", staff_id: "stf-ravi", kind: "low_stock", title: "Low stock: UPS batteries", body: "Exide 12V 100Ah — 2 remaining (min 4).", ref_type: "spare", ref_id: "sp-3" },
  { id: "nt-9", staff_id: "stf-sanjay", kind: "pm_overdue", title: "Heat pump PM overdue", body: "PLB-HW-001.", ref_type: "pm", ref_id: "pm-17" },
  { id: "nt-10", staff_id: "stf-farhan", kind: "pm_overdue", title: "Sprinkler inspection overdue", body: "FIR-SPR-001.", ref_type: "pm", ref_id: "pm-15" },
  { id: "nt-11", staff_id: "stf-anita", kind: "assigned_task", title: "Work order WO-2026-00011 in progress", body: "Emergency luminaires.", ref_type: "work_order", ref_id: "wo-11" },
  { id: "nt-12", staff_id: "stf-kavitha", kind: "sla_breach", title: "UPS ticket open > 24h", body: "BD-2026-00003 Numeric 80 kVA.", ref_type: "breakdown", ref_id: "bd-3" },
];

const audit_logs = [
  { id: "aud-1", staff_id: "stf-leela", action: "create", entity_type: "breakdown", entity_id: "bd-1", new_value: { ticket: "BD-2026-00001" } },
  { id: "aud-2", staff_id: "stf-kavitha", action: "assign", entity_type: "breakdown", entity_id: "bd-1", new_value: { engineer: "stf-meera", technician: "stf-rahul" } },
  { id: "aud-3", staff_id: "stf-kavitha", action: "approve", entity_type: "work_order", entity_id: "wo-2", new_value: { status: "approved" } },
  { id: "aud-4", staff_id: "stf-sanjay", action: "complete", entity_type: "pm", entity_id: "pm-6", new_value: { status: "completed" } },
  { id: "aud-5", staff_id: "stf-meera", action: "close", entity_type: "breakdown", entity_id: "bd-13", new_value: { status: "verified" } },
];

const settings = [{ id: "default", name: "Helios Eye Hospital", campus: "Jayanagar Campus", city: "Bengaluru", beds: 80, ot_count: 4, timezone: "Asia/Kolkata" }];

const out = `-- Sightline demo data — Helios Eye Hospital, Bengaluru (as of ${TODAY})
${ins("hospital_settings", settings)}
${ins("departments", departments)}
${ins("locations", locations)}
${ins("vendors", vendors)}
${ins("staff", staff)}
${ins("asset_categories", categories)}
${ins("assets", assets)}
${ins("contracts", contracts)}
${ins("checklists", checklists)}
${ins("checklist_items", checklist_items)}
${ins("pm_plans", pm_plans)}
${ins("pm_records", pm_records)}
${ins("breakdowns", breakdowns)}
${ins("work_orders", work_orders)}
${ins("spares", spares)}
${ins("stock_movements", stock_movements)}
${ins("breakdown_spares", breakdown_spares)}
${ins("calibrations", calibrations)}
${ins("inspections", inspections)}
${ins("inspection_results", inspection_results)}
${ins("logbook_entries", logbook_entries)}
${ins("utility_readings", utility_readings)}
${ins("housekeeping_tasks", housekeeping_tasks)}
${ins("incidents", incidents)}
${ins("rca", rca)}
${ins("documents", documents)}
${ins("notifications", notifications)}
${ins("audit_logs", audit_logs)}
`;

writeFileSync("/workspace/migrations/0003_seed.sql", out);
console.log("Wrote 0003_seed.sql", {
  assets: assets.length,
  breakdowns: breakdowns.length,
  pm: pm_records.length,
  vendors: vendors.length,
  contracts: contracts.length,
  spares: spares.length,
  staff: staff.length,
  inspections: inspections.length,
  logbooks: logbook_entries.length,
  utilities: utility_readings.length,
});
