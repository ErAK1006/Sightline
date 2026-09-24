import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getBreakdown, updateBreakdown } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge, PriorityBadge } from "@/components/hospital/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useHospital } from "@/components/layout/hospital-app";
import { formatDateTime, formatHours, formatInr } from "@/lib/utils";
import { EmptyState } from "@/components/hospital/empty-state";
import { can } from "@/lib/hospital/roles";
import { toast } from "sonner";

export const Route = createFileRoute("/breakdowns/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const { lookups, staff } = useHospital();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["breakdown", id], queryFn: () => getBreakdown({ data: { id } }) });
  const [root, setRoot] = useState("");
  const [action, setAction] = useState("");
  const [tech, setTech] = useState("");
  const [eng, setEng] = useState("");
  const mut = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateBreakdown({ data: { id, ...patch } }),
    onSuccess: () => {
      toast.success("Ticket updated");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isPending) return <p className="text-sm text-muted">Loading ticket…</p>;
  if (!q.data) return <EmptyState title="Ticket not found" />;
  const t = q.data.ticket as Record<string, unknown>;
  const writable = can(staff.effective_role, "breakdowns.write");

  return (
    <div>
      <PageHeader
        eyebrow={String(t.ticket_number)}
        title={String(t.description)}
        description={`${t.asset_code ?? "Facility"} · ${t.location_name ?? ""} · reported ${formatDateTime(String(t.reported_at))}`}
        actions={<PriorityBadge value={String(t.priority)} />}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge value={String(t.status)} />
        <span className="text-sm text-muted">Response {formatHours(Number(t.response_minutes ?? 0))}</span>
        {t.resolution_minutes != null && <span className="text-sm text-muted">Resolution {formatHours(Number(t.resolution_minutes))}</span>}
        {Number(t.cost) > 0 && <span className="text-sm text-muted">{formatInr(Number(t.cost))}</span>}
      </div>

      {t.asset_id && (
        <p className="mb-4 text-sm">
          Asset{" "}
          <Link className="font-mono text-primary" to="/assets/$id" params={{ id: String(t.asset_id) }}>
            {String(t.asset_code)}
          </Link>{" "}
          · {String(t.asset_name)}
        </p>
      )}

      {t.photo_data ? (
        <img src={String(t.photo_data)} alt="" className="mb-4 max-h-56 rounded-xl object-cover outline outline-1 -outline-offset-1 outline-fg/10" />
      ) : null}

      {writable && (
        <div className="mb-6 space-y-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Engineer</Label>
              <Select value={eng || String(t.assigned_engineer_id ?? "")} onChange={(e) => setEng(e.target.value)}>
                <option value="">Assign engineer</option>
                {lookups.staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Technician</Label>
              <Select value={tech || String(t.assigned_technician_id ?? "")} onChange={(e) => setTech(e.target.value)}>
                <option value="">Assign technician</option>
                {lookups.staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => mut.mutate({ status: "assigned", assigned_engineer_id: eng || t.assigned_engineer_id, assigned_technician_id: tech || t.assigned_technician_id })}>Assign</Button>
            <Button size="sm" variant="outline" onClick={() => mut.mutate({ status: "in_progress" })}>Start work</Button>
            <Button size="sm" variant="outline" onClick={() => mut.mutate({ status: "pending_spares" })}>Wait on spares</Button>
            <Button size="sm" variant="outline" onClick={() => mut.mutate({ status: "pending_vendor" })}>Vendor required</Button>
          </div>
          <div className="space-y-1.5">
            <Label>Root cause</Label>
            <Input value={root} onChange={(e) => setRoot(e.target.value)} placeholder={String(t.root_cause ?? "")} />
          </div>
          <div className="space-y-1.5">
            <Label>Corrective action</Label>
            <Textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder={String(t.corrective_action ?? "")} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => mut.mutate({ status: "resolved", root_cause: root || t.root_cause, corrective_action: action || t.corrective_action })}>Mark resolved</Button>
            <Button size="sm" variant="secondary" onClick={() => mut.mutate({ status: "verified" })}>Engineer verify</Button>
            <Button size="sm" onClick={() => mut.mutate({ status: "closed", root_cause: root || t.root_cause, corrective_action: action || t.corrective_action })}>Close</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Fact label="Reported by" value={String(t.reporter_name ?? "—")} />
        <Fact label="Department" value={String(t.department_name ?? "—")} />
        <Fact label="Engineer" value={String(t.engineer_name ?? "—")} />
        <Fact label="Technician" value={String(t.technician_name ?? "—")} />
        <Fact label="Vendor" value={String(t.vendor_name ?? "—")} />
        <Fact label="Category" value={String(t.category)} />
      </div>

      {q.data.rca && (
        <div className="mt-6 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg font-semibold">RCA</h2>
          <p className="mt-2 text-sm">{String((q.data.rca as Record<string, unknown>).root_cause)}</p>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
