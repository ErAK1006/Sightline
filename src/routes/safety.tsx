import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listSafety } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge } from "@/components/hospital/status-badge";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/safety")({ component: Page });

function Page() {
  const q = useQuery({ queryKey: ["safety"], queryFn: () => listSafety() });
  return (
    <div>
      <PageHeader eyebrow="Life safety" title="Fire & safety" description="Extinguishers, alarm, hydrant, sprinkler, pumps, exits, detectors." />
      <TableWrap>
        <thead>
          <tr>
            <Th>Code</Th>
            <Th>Equipment</Th>
            <Th>Location</Th>
            <Th>Next inspection</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {(q.data?.equipment ?? []).map((a) => (
            <tr key={String(a.id)}>
              <Td>
                <Link className="font-mono text-xs text-primary" to="/assets/$id" params={{ id: String(a.id) }}>{String(a.asset_code)}</Link>
              </Td>
              <Td>
                <div>{String(a.name)}</div>
                <div className="text-xs text-muted">{String(a.sub_category)}</div>
              </Td>
              <Td className="text-xs">{String(a.location_name ?? "")}</Td>
              <Td className="text-xs">{formatDate(String(a.next_maintenance ?? ""))}</Td>
              <Td><StatusBadge value={String(a.status)} /></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <h2 className="mb-2 mt-8 font-display text-lg font-semibold">Fire rounds</h2>
      <ul className="space-y-2 text-sm">
        {(q.data?.rounds ?? []).map((r) => (
          <li key={String(r.id)} className="flex justify-between rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
            <span>{String(r.name)}</span>
            <StatusBadge value={String(r.status)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
