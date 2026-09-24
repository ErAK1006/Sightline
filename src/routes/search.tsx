import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchGlobal } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type Search = { q?: string };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): Search => ({ q: typeof s.q === "string" ? s.q : "" }),
  component: Page,
});

function Page() {
  const initial = Route.useSearch().q ?? "";
  const [q, setQ] = useState(initial);
  const query = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchGlobal({ data: { q } }),
    enabled: q.trim().length >= 2,
  });
  const data = query.data;

  return (
    <div>
      <PageHeader eyebrow="Find" title="Search" description="Assets, tickets, work orders, staff, and vendors." />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="MED-OT-001, BD-2026, Kavitha…" className="mb-6 max-w-lg" />
      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <Group title="Assets" items={data.assets} href={(r) => `/assets/${r.id}`} label={(r) => `${r.asset_code} · ${r.name}`} />
          <Group title="Breakdowns" items={data.breakdowns} href={(r) => `/breakdowns/${r.id}`} label={(r) => `${r.ticket_number} · ${r.description}`} />
          <Group title="Work orders" items={data.workOrders} href={(r) => `/work-orders/${r.id}`} label={(r) => `${r.wo_number} · ${r.problem}`} />
          <Group title="Staff" items={data.staff} href={() => "/settings"} label={(r) => `${r.name} · ${r.role}`} />
          <Group title="Vendors" items={data.vendors} href={() => "/vendors"} label={(r) => `${r.name}`} />
        </div>
      )}
    </div>
  );
}

function Group({ title, items, href, label }: { title: string; items: Array<Record<string, unknown>>; href: (r: Record<string, unknown>) => string; label: (r: Record<string, unknown>) => string }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold">{title}</h2>
      <ul className="divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]">
        {items.map((r) => (
          <li key={String(r.id)}>
            <Link to={href(r)} className="block truncate px-4 py-3 text-sm hover:bg-surface-2">{label(r)}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
