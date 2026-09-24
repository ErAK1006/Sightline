import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboard } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { KpiCard } from "@/components/hospital/kpi-card";
import { StatusBadge, PriorityBadge } from "@/components/hospital/status-badge";
import { formatHours, formatInr, formatNumber } from "@/lib/utils";
import { useHospital } from "@/components/layout/hospital-app";
import { ROLE_LABEL } from "@/lib/hospital/roles";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({ component: Dashboard });

const CHART = {
  primary: "var(--color-primary)",
  ink: "var(--color-fg)",
  muted: "var(--color-muted)",
  warn: "var(--color-warning)",
  danger: "var(--color-danger)",
  soft: "var(--color-primary-soft)",
};

function Dashboard() {
  const { staff, hospital } = useHospital();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  if (q.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (q.error) return <p className="text-danger">{q.error.message}</p>;
  const d = q.data!;
  const k = d.kpis;

  return (
    <div>
      <PageHeader
        eyebrow={hospital.campus ?? "Campus"}
        title={`Good ${hourGreeting()}, ${staff.name.split(" ")[0]}`}
        description={`${hospital.name} · ${ROLE_LABEL[staff.effective_role]} · live operations picture for engineering, biomedical, and facilities.`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        <KpiCard label="Assets" value={formatNumber(k.total_assets)} hint={`${formatNumber(k.assets_amc)} AMC · ${formatNumber(k.assets_cmc)} CMC`} />
        <KpiCard label="Open breakdowns" value={formatNumber(k.open_breakdowns)} hint={`${formatNumber(k.critical_breakdowns)} critical`} tone={k.critical_breakdowns ? "danger" : "default"} />
        <KpiCard label="PM overdue" value={formatNumber(k.overdue_pm)} hint={`${formatNumber(k.pending_pm)} due / pending`} tone={k.overdue_pm ? "warning" : "success"} />
        <KpiCard label="Today’s tasks" value={formatNumber(k.today_tasks)} hint={`${formatNumber(k.pending_wo)} open work orders`} />
        <KpiCard label="MTTR" value={formatHours(k.mttr)} hint="Mean time to repair" />
        <KpiCard label="Availability" value={`${formatNumber(k.availability, 1)}%`} hint="Asset uptime (30-day)" tone="success" />
        <KpiCard label="PM compliance" value={`${formatNumber(k.pm_compliance, 1)}%`} hint="Completed on or before due" />
        <KpiCard label="Month cost" value={formatInr(k.month_cost)} hint={`${formatHours(k.month_downtime)} downtime`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Expiring AMC/CMC" value={formatNumber(k.expiring_amc)} hint={`${formatNumber(k.expired_contracts)} already expired`} tone={k.expiring_amc ? "warning" : "default"} />
        <KpiCard label="Calibration due" value={formatNumber(k.expiring_cal)} hint={`${formatNumber(k.overdue_cal)} overdue`} tone={k.overdue_cal ? "danger" : "default"} />
        <KpiCard label="Energy (MTD)" value={`${formatNumber(k.energy_kwh)} kWh`} />
        <KpiCard label="Water (MTD)" value={`${formatNumber(k.water_kl, 1)} kL`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Breakdown trend" subtitle="Last 14 days">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d.breakdownTrend}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: CHART.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: CHART.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke={CHART.primary} fill={CHART.soft} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Department complaints" subtitle="60 days">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.complaintsByDept} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: CHART.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={CHART.primary} radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Electricity" subtitle="kWh · 14 days">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d.energy}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: CHART.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="kwh" stroke={CHART.ink} fill="var(--color-surface-2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Water" subtitle="kL · 14 days">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d.water}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: CHART.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="kl" stroke={CHART.primary} fill={CHART.soft} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Critical & high open</h2>
            <Link to="/breakdowns" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-border">
            {d.openCritical.map((row) => (
              <li key={String(row.id)} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link to="/breakdowns/$id" params={{ id: String(row.id) }} className="font-mono text-xs text-primary">
                    {String(row.ticket_number)}
                  </Link>
                  <div className="truncate text-sm">{String(row.description)}</div>
                  <div className="text-xs text-muted">{String(row.asset_code ?? "Facility")} · {String(row.location_name ?? "")}</div>
                </div>
                <PriorityBadge value={String(row.priority)} />
              </li>
            ))}
            {!d.openCritical.length && <li className="py-6 text-sm text-muted">No critical tickets. Quiet floor.</li>}
          </ul>
        </div>
        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">PM queue</h2>
            <Link to="/pm" className="text-sm text-primary hover:underline">Schedules</Link>
          </div>
          <ul className="divide-y divide-border">
            {d.duePm.map((row) => (
              <li key={String(row.id)} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted">{String(row.pm_number)}</div>
                  <div className="truncate text-sm">{String(row.asset_name)}</div>
                  <div className="text-xs text-muted">{String(row.technician_name ?? "Unassigned")} · {String(row.scheduled_date)}</div>
                </div>
                <StatusBadge value={String(row.status)} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="mb-3 font-display text-lg font-semibold">Technician workload</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.technicians}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART.muted, fontSize: 10 }} interval={0} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: CHART.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="open" fill={CHART.warn} radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill={CHART.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="mb-3 font-display text-lg font-semibold">Expiring compliance</h2>
          <ul className="divide-y divide-border">
            {d.expiring.map((row, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <div className="font-medium">{String(row.label)}</div>
                  <div className="text-xs text-muted">{String(row.kind)} · {String(row.extra ?? "")}</div>
                </div>
                <div className="font-mono text-xs tabular-nums">{String(row.due).slice(0, 10)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="mb-3 font-display text-lg font-semibold">Repeat offenders</h2>
        <div className="flex flex-wrap gap-2">
          {d.assetBreakdowns.map((a) => (
            <div key={a.name} className="rounded-full bg-surface-2 px-3 py-1 text-xs">
              <span className="font-mono">{a.name}</span>
              <span className="ml-2 tabular-nums text-muted">{a.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          {d.pmCompliance.map((p, i) => (
            <div key={p.name} className="flex items-center gap-2 text-xs text-muted">
              <span className="size-2 rounded-full" style={{ background: [CHART.primary, CHART.warn, CHART.danger][i] }} />
              {p.name} {p.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <div className="mb-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

function hourGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
