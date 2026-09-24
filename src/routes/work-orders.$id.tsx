import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkOrder, saveWorkOrder } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge, PriorityBadge } from "@/components/hospital/status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useHospital } from "@/components/layout/hospital-app";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/hospital/empty-state";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/work-orders/$id")({ component: Detail });

const FLOW = ["requested", "approved", "assigned", "in_progress", "on_hold", "completed", "verified", "closed"];

function Detail() {
  const { id } = Route.useParams();
  const { lookups } = useHospital();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wo", id], queryFn: () => getWorkOrder({ data: { id } }) });
  const [tech, setTech] = useState("");
  const mut = useMutation({
    mutationFn: (patch: Record<string, unknown>) => saveWorkOrder({ data: { id, ...patch } }),
    onSuccess: () => {
      toast.success("Updated");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isPending) return <p className="text-sm text-muted">Loading…</p>;
  if (!q.data) return <EmptyState title="Work order not found" />;
  const w = q.data.wo as Record<string, unknown>;

  return (
    <div>
      <PageHeader eyebrow={String(w.wo_number)} title={String(w.problem)} description={`Requested ${formatDateTime(String(w.created_at))}`} actions={<PriorityBadge value={String(w.priority)} />} />
      <div className="mb-4"><StatusBadge value={String(w.status)} /></div>
      {w.asset_id && (
        <p className="mb-4 text-sm">
          <Link className="font-mono text-primary" to="/assets/$id" params={{ id: String(w.asset_id) }}>{String(w.asset_code)}</Link> · {String(w.asset_name)}
        </p>
      )}
      <div className="space-y-3 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <Select value={tech || String(w.technician_id ?? "")} onChange={(e) => setTech(e.target.value)}>
          <option value="">Technician</option>
          {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <div className="flex flex-wrap gap-2">
          {FLOW.map((s) => (
            <Button key={s} size="sm" variant={w.status === s ? "default" : "outline"} onClick={() => mut.mutate({ status: s, technician_id: tech || w.technician_id })}>
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
