import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getInspection, submitInspection } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/hospital/empty-state";
import { toast } from "sonner";

export const Route = createFileRoute("/inspections/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["inspection", id], queryFn: () => getInspection({ data: { id } }) });
  const [rows, setRows] = useState<Array<{ item_id?: string; label: string; result: string; observation: string }>>([]);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (!q.data) return;
    if (q.data.results.length) {
      setRows(q.data.results.map((r) => ({ item_id: String(r.item_id ?? ""), label: String(r.label), result: String(r.result), observation: String(r.observation ?? "") })));
    } else {
      setRows(q.data.items.map((i) => ({ item_id: String(i.id), label: String(i.label), result: "pass", observation: "" })));
    }
    setNotes(String(q.data.inspection.notes ?? ""));
  }, [q.data]);
  const mut = useMutation({
    mutationFn: () => submitInspection({ data: { id, notes, results: rows } }),
    onSuccess: (res) => {
      toast.success(`Round scored ${res.score}${res.ticketId ? " · fail ticket opened" : ""}`);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isPending) return <p className="text-sm text-muted">Loading…</p>;
  if (!q.data) return <EmptyState title="Round not found" />;
  const ins = q.data.inspection;

  return (
    <div>
      <PageHeader eyebrow={String(ins.round_type)} title={String(ins.name)} description={ins.inspector_name ? `Inspector ${ins.inspector_name}` : "Complete every item. Fail creates a maintenance ticket."} />
      <div className="space-y-3">
        {rows.map((r, idx) => (
          <div key={idx} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="font-medium">{r.label}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["pass", "fail", "n/a"].map((v) => (
                <Button key={v} size="sm" variant={r.result === v ? "default" : "outline"} onClick={() => setRows(rows.map((x, i) => (i === idx ? { ...x, result: v } : x)))}>
                  {v}
                </Button>
              ))}
            </div>
            <Textarea className="mt-2" placeholder="Observation" value={r.observation} onChange={(e) => setRows(rows.map((x, i) => (i === idx ? { ...x, observation: e.target.value } : x)))} />
          </div>
        ))}
      </div>
      <Textarea className="mt-4" placeholder="Round notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {String(ins.status) !== "completed" && (
        <Button className="mt-4 w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>Submit round</Button>
      )}
    </div>
  );
}
