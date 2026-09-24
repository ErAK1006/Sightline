import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listHousekeeping, updateHousekeeping } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge } from "@/components/hospital/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { labelize } from "@/lib/hospital/roles";

export const Route = createFileRoute("/housekeeping")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["hk"], queryFn: () => listHousekeeping() });
  const mut = useMutation({
    mutationFn: (id: string) => updateHousekeeping({ data: { id, status: "completed", score: 95 } }),
    onSuccess: () => {
      toast.success("Task closed");
      void qc.invalidateQueries({ queryKey: ["hk"] });
    },
  });
  return (
    <div>
      <PageHeader eyebrow="Environment" title="Housekeeping" description="OT terminal cleans, toilets, waste, pest control, and common areas." />
      <div className="grid gap-3 md:grid-cols-2">
        {(q.data ?? []).map((t) => (
          <article key={String(t.id)} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{String(t.area)}</div>
                <div className="text-xs text-muted">{labelize(String(t.task_type))} · {formatDate(String(t.scheduled_date))}</div>
              </div>
              <StatusBadge value={String(t.status)} />
            </div>
            <div className="mt-2 text-xs text-muted">{String(t.assignee_name ?? "")} {t.score != null ? `· score ${t.score}` : ""}</div>
            {String(t.status) !== "completed" && (
              <Button size="sm" className="mt-3" variant="outline" onClick={() => mut.mutate(String(t.id))}>Mark complete</Button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
