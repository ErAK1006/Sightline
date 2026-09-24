import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listWorkOrders, saveWorkOrder } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge, PriorityBadge } from "@/components/hospital/status-badge";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useHospital } from "@/components/layout/hospital-app";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/work-orders")({ component: Page });

function Page() {
  const { lookups } = useHospital();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wo", status], queryFn: () => listWorkOrders({ data: { status: status || undefined } }) });
  const [problem, setProblem] = useState("");
  const [asset, setAsset] = useState("");
  const [priority, setPriority] = useState("medium");
  const mut = useMutation({
    mutationFn: () => saveWorkOrder({ data: { problem, asset_id: asset || null, priority } }),
    onSuccess: () => {
      toast.success("Work order requested");
      setOpen(false);
      setProblem("");
      void qc.invalidateQueries({ queryKey: ["wo"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = q.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Workflow"
        title="Work orders"
        description="Request → approval → assignment → work → verification → close."
        actions={<Button onClick={() => setOpen(true)}>New request</Button>}
      />
      <Select className="mb-4 max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {["requested", "approved", "assigned", "in_progress", "on_hold", "completed", "verified", "closed"].map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </Select>
      <TableWrap>
        <thead>
          <tr>
            <Th>WO</Th>
            <Th>Problem</Th>
            <Th>Asset</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Technician</Th>
            <Th>Planned</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={String(w.id)} className="hover:bg-surface-2/60">
              <Td>
                <Link to="/work-orders/$id" params={{ id: String(w.id) }} className="font-mono text-xs text-primary">{String(w.wo_number)}</Link>
              </Td>
              <Td className="max-w-xs truncate">{String(w.problem)}</Td>
              <Td className="font-mono text-xs">{String(w.asset_code ?? "—")}</Td>
              <Td><PriorityBadge value={String(w.priority)} /></Td>
              <Td><StatusBadge value={String(w.status)} /></Td>
              <Td className="text-xs">{String(w.technician_name ?? "—")}</Td>
              <Td className="text-xs">{formatDate(String(w.planned_date ?? ""))}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New work order</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Asset</Label>
              <Select value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="">None</option>
                {lookups.assets.map((a) => <option key={a.id} value={a.id}>{a.extra} {a.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {["critical", "high", "medium", "low"].map((p) => <option key={p}>{p}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Problem</Label>
              <Textarea required value={problem} onChange={(e) => setProblem(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={mut.isPending}>Submit request</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
