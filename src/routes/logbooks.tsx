import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addLogbook, listLogbooks } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useHospital } from "@/components/layout/hospital-app";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/logbooks")({ component: Page });

const TYPES = [
  { id: "dg", label: "DG", fields: ["running_hours", "fuel_level_pct", "load_kw", "voltage", "current", "frequency", "oil_pressure", "battery_voltage", "coolant_temp"] },
  { id: "electrical", label: "Electrical", fields: ["incoming_voltage", "current", "load_kw", "panel_status", "dg_status", "ups_status", "battery_status", "transformer_temp"] },
  { id: "hvac", label: "HVAC", fields: ["temperature", "humidity", "ahu_status", "filter_condition", "dp_pa", "chiller_load_pct", "compressor_status"] },
  { id: "ro", label: "RO / Water", fields: ["tds", "ph", "pressure_bar", "flow_lph", "tank_level_pct", "pump_status", "consumption_kl"] },
  { id: "ot", label: "OT", fields: ["room_temp", "humidity", "dp_pa", "ahu_status", "ot_equipment", "cleaning_status"] },
  { id: "medical", label: "Medical", fields: ["equipment_status", "usage_hours", "daily_inspection", "cleaning", "functional_check"] },
];

function Page() {
  const { lookups } = useHospital();
  const [type, setType] = useState("dg");
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState("");
  const [remarks, setRemarks] = useState("");
  const [readings, setReadings] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["logbooks", type], queryFn: () => listLogbooks({ data: { type } }) });
  const spec = TYPES.find((t) => t.id === type)!;
  const mut = useMutation({
    mutationFn: () => addLogbook({ data: { logbook_type: type, asset_id: asset || null, readings, remarks } }),
    onSuccess: () => {
      toast.success("Logbook entry saved");
      setOpen(false);
      setReadings({});
      void qc.invalidateQueries({ queryKey: ["logbooks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader eyebrow="Digital books" title="Logbooks" description="DG, electrical, HVAC, RO, OT environment, and medical equipment — no paper registers." actions={<Button onClick={() => setOpen(true)}>New reading</Button>} />
      <Tabs value={type} onValueChange={setType}>
        <TabsList className="mb-4 flex w-full flex-wrap">
          {TYPES.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="space-y-3">
        {(q.data ?? []).map((e) => (
          <article key={String(e.id)} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-medium">{String(e.asset_name ?? e.logbook_type)}</div>
              <div className="text-xs text-muted">{formatDateTime(String(e.recorded_at))} · {String(e.recorder_name ?? "")}</div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {Object.entries((e.readings as Record<string, unknown>) ?? {}).map(([k, v]) => (
                <div key={k}>
                  <dt className="uppercase tracking-wider text-muted">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-mono text-sm">{String(v)}</dd>
                </div>
              ))}
            </dl>
            {e.remarks ? <p className="mt-2 text-sm text-muted">{String(e.remarks)}</p> : null}
          </article>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New {spec.label} entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={asset} onChange={(e) => setAsset(e.target.value)}>
              <option value="">Asset (optional)</option>
              {lookups.assets.map((a) => <option key={a.id} value={a.id}>{a.extra} {a.name}</option>)}
            </Select>
            {spec.fields.map((f) => (
              <div key={f} className="space-y-1">
                <Label>{f.replace(/_/g, " ")}</Label>
                <Input value={readings[f] ?? ""} onChange={(e) => setReadings({ ...readings, [f]: e.target.value })} />
              </div>
            ))}
            <Textarea placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>Save entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
