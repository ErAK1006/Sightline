import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listBreakdowns } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge, PriorityBadge } from "@/components/hospital/status-badge";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateTime, formatHours } from "@/lib/utils";
import { EmptyState } from "@/components/hospital/empty-state";

export const Route = createFileRoute("/breakdowns")({ component: Page });

function Page() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const query = useQuery({
    queryKey: ["breakdowns", q, status, priority],
    queryFn: () => listBreakdowns({ data: { q: q || undefined, status: status || undefined, priority: priority || undefined } }),
  });
  const rows = query.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Breakdowns"
        description="From the floor report to engineer verification. Every ticket updates asset history, downtime, and MTTR."
        actions={
          <Button asChild>
            <Link to="/breakdowns/new">Report issue</Link>
          </Button>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Ticket, asset, description…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["open", "assigned", "in_progress", "pending_spares", "pending_vendor", "resolved", "verified", "closed"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {["critical", "high", "medium", "low"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      {!rows.length && !query.isPending ? (
        <EmptyState title="No tickets" description="Report a breakdown from here or by scanning an asset QR." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Ticket</Th>
              <Th>Problem</Th>
              <Th>Asset</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Owner</Th>
              <Th>Age</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={String(b.id)} className="hover:bg-surface-2/60">
                <Td>
                  <Link to="/breakdowns/$id" params={{ id: String(b.id) }} className="font-mono text-xs text-primary">
                    {String(b.ticket_number)}
                  </Link>
                  <div className="text-[11px] text-muted">{formatDateTime(String(b.reported_at))}</div>
                </Td>
                <Td className="max-w-xs truncate">{String(b.description)}</Td>
                <Td>
                  <div className="font-mono text-xs">{String(b.asset_code ?? "—")}</div>
                  <div className="text-xs text-muted">{String(b.location_name ?? "")}</div>
                </Td>
                <Td><PriorityBadge value={String(b.priority)} /></Td>
                <Td><StatusBadge value={String(b.status)} /></Td>
                <Td className="text-xs">{String(b.technician_name ?? b.engineer_name ?? "Unassigned")}</Td>
                <Td className="tabular-nums text-xs">{b.resolution_minutes ? formatHours(Number(b.resolution_minutes)) : "open"}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
