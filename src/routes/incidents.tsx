import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listIncidents, saveIncident, saveRca } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge } from "@/components/hospital/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { labelize } from "@/lib/hospital/roles";

export const Route = createFileRoute("/incidents")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["incidents"], queryFn: () => listIncidents() });
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("equipment_failure");
  const [desc, setDesc] = useState("");
  const mut = useMutation({
    mutationFn: () => saveIncident({ data: { incident_type: type, description: desc, occurred_at: new Date().toISOString() } }),
    onSuccess: async (res) => {
      await saveRca({ data: { incident_id: String(res.id), method: "5_why", five_whys: [desc], root_cause: "Pending investigation" } });
      toast.success("Incident logged");
      setOpen(false);
      setDesc("");
      void qc.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader eyebrow="Safety" title="Incidents" description="Facility events with immediate action, RCA, and closure evidence." actions={<Button onClick={() => setOpen(true)}>Report incident</Button>} />
      <div className="space-y-3">
        {(q.data ?? []).map((i) => (
          <article key={String(i.id)} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-xs text-primary">{String(i.incident_number)}</div>
              <StatusBadge value={String(i.status)} />
            </div>
            <h3 className="mt-1 font-medium">{labelize(String(i.incident_type))}</h3>
            <p className="mt-1 text-sm text-muted">{String(i.description)}</p>
            <p className="mt-2 text-xs text-muted">{String(i.location_name ?? "")} · {formatDateTime(String(i.occurred_at))} · {String(i.reporter_name ?? "")}</p>
          </article>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {["equipment_failure", "electrical_incident", "fire_incident", "water_leakage", "hvac_failure", "patient_safety_facility", "property_damage", "other"].map((t) => (
                  <option key={t} value={t}>{labelize(t)}</option>
                ))}
              </Select>
            </div>
            <Textarea required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What happened" />
            <Button className="w-full" onClick={() => mut.mutate()} disabled={!desc.trim() || mut.isPending}>File incident</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
