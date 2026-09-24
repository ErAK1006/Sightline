import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationsRead } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { labelize } from "@/lib/hospital/roles";

export const Route = createFileRoute("/notifications")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const mut = useMutation({
    mutationFn: (id?: string) => markNotificationsRead({ data: id ? { id } : {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Breakdowns, PM, AMC expiry, calibration, low stock, and SLA warnings."
        actions={<Button variant="outline" onClick={() => mut.mutate(undefined)}>Mark all read</Button>}
      />
      <ul className="space-y-2">
        {(q.data ?? []).map((n) => {
          const to = n.ref_type === "breakdown" ? `/breakdowns/${n.ref_id}` : n.ref_type === "work_order" ? `/work-orders/${n.ref_id}` : n.ref_type === "pm" ? "/pm" : "/notifications";
          return (
            <li key={String(n.id)}>
              <Link
                to={to}
                className={`block rounded-xl px-4 py-3 shadow-[var(--shadow-border)] ${n.read_at ? "bg-surface" : "bg-primary-soft"}`}
                onClick={() => mut.mutate(String(n.id))}
              >
                <div className="text-[11px] uppercase tracking-wider text-muted">{labelize(String(n.kind))}</div>
                <div className="font-medium">{String(n.title)}</div>
                <p className="text-sm text-muted">{String(n.body ?? "")}</p>
                <div className="mt-1 text-xs text-muted">{formatDateTime(String(n.created_at))}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
