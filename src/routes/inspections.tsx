import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listInspections } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge } from "@/components/hospital/status-badge";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/inspections")({ component: Page });

function Page() {
  const q = useQuery({ queryKey: ["inspections"], queryFn: () => listInspections() });
  return (
    <div>
      <PageHeader eyebrow="Rounds" title="Inspections" description="Morning, OT, fire, electrical, HVAC, and housekeeping rounds. A fail creates a ticket." />
      <TableWrap>
        <thead>
          <tr>
            <Th>Round</Th>
            <Th>Inspector</Th>
            <Th>When</Th>
            <Th>Score</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {(q.data ?? []).map((i) => (
            <tr key={String(i.id)}>
              <Td>
                <Link to="/inspections/$id" params={{ id: String(i.id) }} className="font-medium text-primary">{String(i.name)}</Link>
                <div className="text-xs text-muted">{String(i.round_type)}</div>
              </Td>
              <Td className="text-sm">{String(i.inspector_name ?? "—")}</Td>
              <Td className="text-xs">{formatDateTime(String(i.scheduled_at ?? i.created_at))}</Td>
              <Td className="tabular-nums">{i.score == null ? "—" : String(i.score)}</Td>
              <Td><StatusBadge value={String(i.status)} /></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
