import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listUtilities } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { formatDate, formatInr } from "@/lib/utils";

export const Route = createFileRoute("/utilities")({ component: Page });

function Page() {
  const q = useQuery({ queryKey: ["utilities"], queryFn: () => listUtilities() });
  const rows = q.data ?? [];
  const elec = rows.filter((r) => r.utility_type === "electricity").slice().reverse();
  const water = rows.filter((r) => r.utility_type === "water").slice().reverse();
  const chartE = elec.map((r) => ({ day: String(r.recorded_on).slice(5), kwh: Number((r.readings as Record<string, unknown>)?.kwh ?? 0) }));
  const chartW = water.map((r) => ({ day: String(r.recorded_on).slice(5), kl: Number((r.readings as Record<string, unknown>)?.kl ?? 0) }));

  return (
    <div>
      <PageHeader eyebrow="Campus" title="Utilities" description="Electricity, water, diesel, and HVAC energy — daily readings with cost." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Electricity kWh">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartE}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} width={36} />
              <Tooltip />
              <Area dataKey="kwh" stroke="var(--color-primary)" fill="var(--color-primary-soft)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Water kL">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartW}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} width={32} />
              <Tooltip />
              <Area dataKey="kl" stroke="var(--color-info)" fill="var(--color-info-soft)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="mt-6 space-y-2">
        {rows.slice(0, 24).map((r) => (
          <div key={String(r.id)} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-sm shadow-[var(--shadow-border)]">
            <div>
              <div className="font-medium capitalize">{String(r.utility_type)}</div>
              <div className="text-xs text-muted">{formatDate(String(r.recorded_on))}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs">{JSON.stringify(r.readings).slice(0, 80)}</div>
              <div className="text-xs text-muted">{r.cost ? formatInr(Number(r.cost)) : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
