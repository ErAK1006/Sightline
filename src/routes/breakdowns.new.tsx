import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBreakdown } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useHospital } from "@/components/layout/hospital-app";
import { compressImage } from "@/lib/utils";
import { toast } from "sonner";

type Search = { asset?: string };

export const Route = createFileRoute("/breakdowns/new")({
  validateSearch: (s: Record<string, unknown>): Search => ({ asset: typeof s.asset === "string" ? s.asset : undefined }),
  component: NewBreakdown,
});

function NewBreakdown() {
  const { lookups } = useHospital();
  const search = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [assetId, setAssetId] = useState(search.asset ?? "");
  const [category, setCategory] = useState("medical_equipment");
  const [priority, setPriority] = useState("high");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () =>
      createBreakdown({
        data: {
          asset_id: assetId || null,
          category,
          priority,
          criticality: priority,
          description,
          photo_data: photo,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Ticket ${res.ticket_number} opened`);
      void qc.invalidateQueries();
      void nav({ to: "/breakdowns/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Report" title="New breakdown" description="Describe what failed. A ticket number is issued immediately." />
      <form
        className="space-y-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label>Asset</Label>
          <Select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            <option value="">Not on an asset / general facility</option>
            {lookups.assets.map((a) => (
              <option key={a.id} value={a.id}>{a.extra} — {a.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {["medical_equipment", "electrical", "hvac", "plumbing", "civil", "it_facility", "fire_safety", "other"].map((c) => (
                <option key={c} value={c}>{c.replace("_", " ")}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {["critical", "high", "medium", "low"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>What happened</Label>
          <Textarea required rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Microscope light not working." />
        </div>
        <div className="space-y-1.5">
          <Label>Photo</Label>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setPhoto(await compressImage(file));
            }}
          />
          {photo && <img src={photo} alt="" className="mt-2 max-h-40 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-fg/10" />}
        </div>
        <Button type="submit" className="w-full" disabled={mut.isPending || !description.trim()}>
          {mut.isPending ? "Creating…" : "Create ticket"}
        </Button>
      </form>
    </div>
  );
}
