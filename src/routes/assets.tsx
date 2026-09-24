import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listAssets } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge, PriorityBadge } from "@/components/hospital/status-badge";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useHospital } from "@/components/layout/hospital-app";
import { formatDate, formatInr } from "@/lib/utils";
import { EmptyState } from "@/components/hospital/empty-state";

export const Route = createFileRoute("/assets")({ component: AssetsPage });

function AssetsPage() {
  const { lookups } = useHospital();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const query = useQuery({
    queryKey: ["assets", q, category, status, department],
    queryFn: () => listAssets({ data: { q: q || undefined, category: category || undefined, status: status || undefined, department: department || undefined } }),
  });
  const rows = query.data ?? [];
  const counts = useMemo(() => {
    const c = { operational: 0, maintenance: 0, down: 0 };
    for (const r of rows) {
      const s = String(r.status);
      if (s in c) c[s as keyof typeof c] += 1;
    }
    return c;
  }, [rows]);

  return (
    <div>
      <PageHeader
        eyebrow="Register"
        title="Assets"
        description={`${rows.length} assets on the Helios campus. Scan a QR on the floor, or open a record for history, AMC, and PM.`}
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Search code, name, serial…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {lookups.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {lookups.departments.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="operational">Operational</option>
          <option value="maintenance">Maintenance</option>
          <option value="down">Down</option>
        </Select>
      </div>
      <p className="mb-3 text-xs text-muted">
        Operational {counts.operational} · Maintenance {counts.maintenance} · Down {counts.down}
      </p>
      {query.isPending ? <p className="text-sm text-muted">Loading register…</p> : !rows.length ? (
        <EmptyState title="No assets match" description="Clear filters or add a record from settings." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Asset</Th>
              <Th>Location</Th>
              <Th>Criticality</Th>
              <Th>Status</Th>
              <Th>Next PM</Th>
              <Th className="text-right">Cost</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={String(a.id)} className="hover:bg-surface-2/60">
                <Td>
                  <Link to="/assets/$id" params={{ id: String(a.id) }} className="font-mono text-xs text-primary">
                    {String(a.asset_code)}
                  </Link>
                </Td>
                <Td>
                  <div className="font-medium">{String(a.name)}</div>
                  <div className="text-xs text-muted">{String(a.sub_category ?? a.category_name ?? "")}</div>
                </Td>
                <Td>
                  <div>{String(a.location_name ?? "—")}</div>
                  <div className="text-xs text-muted">{String(a.department_name ?? "")}</div>
                </Td>
                <Td><PriorityBadge value={String(a.criticality)} /></Td>
                <Td><StatusBadge value={String(a.status)} /></Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(String(a.next_maintenance ?? ""))}</Td>
                <Td className="text-right tabular-nums">{formatInr(Number(a.purchase_cost ?? 0))}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
