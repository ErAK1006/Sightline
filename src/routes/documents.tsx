import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { labelize } from "@/lib/hospital/roles";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/documents")({ component: Page });

function Page() {
  const q = useQuery({ queryKey: ["docs"], queryFn: () => listDocuments() });
  return (
    <div>
      <PageHeader eyebrow="Library" title="Documents" description="Manuals, AMC papers, SOPs, drawings, licenses, and certificates linked to assets and vendors." />
      <div className="grid gap-3 md:grid-cols-2">
        {(q.data ?? []).map((d) => (
          <article key={String(d.id)} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="text-[11px] uppercase tracking-wider text-muted">{labelize(String(d.kind))}</div>
            <h3 className="mt-1 font-medium">{String(d.title)}</h3>
            <p className="mt-1 text-xs text-muted">{String(d.linked_type ?? "")} {String(d.linked_id ?? "")} · {String(d.uploader_name ?? "")} · {formatDateTime(String(d.uploaded_at))}</p>
            {d.notes ? <p className="mt-2 text-sm text-muted">{String(d.notes)}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
