import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { completePm, listPm } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge } from "@/components/hospital/status-badge";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/pm")({ component: Page });

function Page() {
  const [status, setStatus] = useState("");
  const [active, setActive] = useState<Record<string, unknown> | null>(null);
  const [obs, setObs] = useState("");
  const [flags, setFlags] = useState({ cleaning: true, testing: true, lubrication: false, calibration: false, safety_checks: true });
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pm", status], queryFn: () => listPm({ data: { status: status || undefined } }) });
  const mut = useMutation({
    mutationFn: () => completePm({ data: { id: String(active!.id), observations: obs, ...flags } }),
    onSuccess: () => {
      toast.success("PM completed");
      setActive(null);
      void qc.invalidateQueries({ queryKey: ["pm"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = q.data ?? [];

  return (
    <div>
      <PageHeader eyebrow="Schedules" title="Preventive maintenance" description="Upcoming, due, overdue, and completed PM for every maintained asset." />
      <Select className="mb-4 max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All</option>
        <option value="due">Due today</option>
        <option value="overdue">Overdue</option>
        <option value="upcoming">Upcoming</option>
        <option value="completed">Completed</option>
      </Select>
      <TableWrap>
        <thead>
          <tr>
            <Th>PM</Th>
            <Th>Asset</Th>
            <Th>Due</Th>
            <Th>Technician</Th>
            <Th>State</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={String(p.id)}>
              <Td className="font-mono text-xs">{String(p.pm_number)}</Td>
              <Td>
                <div className="font-medium">{String(p.asset_name)}</div>
                <div className="font-mono text-[11px] text-muted">{String(p.asset_code)}</div>
              </Td>
              <Td className="whitespace-nowrap text-xs">{formatDate(String(p.scheduled_date))}</Td>
              <Td className="text-xs">{String(p.technician_name ?? "—")}</Td>
              <Td><StatusBadge value={String(p.pm_state ?? p.status)} /></Td>
              <Td>
                {String(p.status) !== "completed" && (
                  <Button size="sm" variant="outline" onClick={() => { setActive(p); setObs(""); }}>Complete</Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete PM · {String(active?.asset_code ?? "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(["cleaning", "testing", "lubrication", "calibration", "safety_checks"] as const).map((k) => (
              <label key={k} className="flex items-center gap-3 text-sm">
                <Checkbox checked={flags[k]} onCheckedChange={(v) => setFlags({ ...flags, [k]: Boolean(v) })} />
                {k.replace("_", " ")}
              </label>
            ))}
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>Save completion</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
