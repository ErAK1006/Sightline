import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAsset } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge, PriorityBadge } from "@/components/hospital/status-badge";
import { QrCode } from "@/components/hospital/qr-code";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatHours, formatInr } from "@/lib/utils";
import { EmptyState } from "@/components/hospital/empty-state";

export const Route = createFileRoute("/assets/$id")({ component: AssetDetail });

function AssetDetail() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["asset", id], queryFn: () => getAsset({ data: { id } }) });
  if (q.isPending) return <p className="text-sm text-muted">Loading asset…</p>;
  if (!q.data) return <EmptyState title="Asset not found" />;
  const { asset: a, breakdowns, pm, workOrders, calibrations, contracts, documents } = q.data;
  const payload = `SL:${a.asset_code}`;

  return (
    <div>
      <PageHeader
        eyebrow={String(a.category_name ?? "Asset")}
        title={String(a.name)}
        description={`${a.asset_code} · ${a.location_name ?? "—"} · ${a.department_name ?? ""}`}
        actions={
          <Button asChild>
            <Link to="/breakdowns/new" search={{ asset: String(a.id) }}>Report breakdown</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Info label="Status" value={<StatusBadge value={String(a.status)} />} />
          <Info label="Criticality" value={<PriorityBadge value={String(a.criticality)} />} />
          <Info label="Serial" value={<span className="font-mono text-xs">{String(a.serial_number ?? "—")}</span>} />
          <Info label="Manufacturer" value={`${a.manufacturer ?? "—"} ${a.model ?? ""}`} />
          <Info label="Vendor" value={String(a.vendor_name ?? "—")} />
          <Info label="Responsible" value={String(a.responsible_name ?? "—")} />
          <Info label="Installed" value={formatDate(String(a.installation_date ?? ""))} />
          <Info label="Warranty" value={formatDate(String(a.warranty_expiry ?? ""))} />
          <Info label="Purchase" value={formatInr(Number(a.purchase_cost ?? 0))} />
          <Info label="Last PM" value={formatDate(String(a.last_maintenance ?? ""))} />
          <Info label="Next PM" value={formatDate(String(a.next_maintenance ?? ""))} />
          <Info label="Breakdowns" value={`${a.total_breakdown_count} · ${formatHours(Number(a.total_downtime_minutes ?? 0))} down`} />
          <Info label="Maint. cost" value={formatInr(Number(a.maintenance_cost ?? 0))} />
          <Info label="Spare cost" value={formatInr(Number(a.spare_cost ?? 0))} />
          <Info label="Calibration" value={a.calibration_required ? "Required" : "Not required"} />
        </div>
        <div className="rounded-xl bg-surface p-4 text-center shadow-[var(--shadow-border)]">
          <QrCode value={payload} size={168} />
          <div className="mt-2 font-mono text-xs">{payload}</div>
          <p className="mt-1 text-xs text-muted">Scan on the floor to open this record.</p>
        </div>
      </div>

      <Tabs defaultValue="breakdowns" className="mt-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
          <TabsTrigger value="pm">PM</TabsTrigger>
          <TabsTrigger value="wo">Work orders</TabsTrigger>
          <TabsTrigger value="cal">Calibration</TabsTrigger>
          <TabsTrigger value="amc">Contracts</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="breakdowns">
          <HistoryList
            rows={breakdowns}
            empty="No breakdowns recorded."
            render={(r) => (
              <Link to="/breakdowns/$id" params={{ id: String(r.id) }} className="flex justify-between gap-3 py-3">
                <span className="font-mono text-xs text-primary">{String(r.ticket_number)}</span>
                <span className="flex-1 truncate text-sm">{String(r.description)}</span>
                <StatusBadge value={String(r.status)} />
              </Link>
            )}
          />
        </TabsContent>
        <TabsContent value="pm">
          <HistoryList
            rows={pm}
            empty="No PM records."
            render={(r) => (
              <div className="flex justify-between gap-3 py-3">
                <span className="font-mono text-xs">{String(r.pm_number)}</span>
                <span className="text-sm">{formatDate(String(r.scheduled_date))}</span>
                <StatusBadge value={String(r.status)} />
              </div>
            )}
          />
        </TabsContent>
        <TabsContent value="wo">
          <HistoryList
            rows={workOrders}
            empty="No work orders."
            render={(r) => (
              <Link to="/work-orders/$id" params={{ id: String(r.id) }} className="flex justify-between gap-3 py-3">
                <span className="font-mono text-xs text-primary">{String(r.wo_number)}</span>
                <span className="flex-1 truncate text-sm">{String(r.problem)}</span>
                <StatusBadge value={String(r.status)} />
              </Link>
            )}
          />
        </TabsContent>
        <TabsContent value="cal">
          <HistoryList
            rows={calibrations}
            empty="No calibration records."
            render={(r) => (
              <div className="flex justify-between gap-3 py-3 text-sm">
                <span>{String(r.agency ?? r.standard_name ?? "Calibration")}</span>
                <span className="text-muted">Due {formatDate(String(r.due_date))}</span>
              </div>
            )}
          />
        </TabsContent>
        <TabsContent value="amc">
          <HistoryList
            rows={contracts}
            empty="No AMC/CMC on this asset."
            render={(r) => (
              <div className="flex justify-between gap-3 py-3 text-sm">
                <span>{String(r.contract_number)} · {String(r.contract_type)}</span>
                <span className="text-muted">{formatDate(String(r.end_date))}</span>
              </div>
            )}
          />
        </TabsContent>
        <TabsContent value="docs">
          <HistoryList
            rows={documents}
            empty="No documents linked."
            render={(r) => (
              <div className="flex justify-between gap-3 py-3 text-sm">
                <span>{String(r.title)}</span>
                <span className="text-muted">{String(r.kind)}</span>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function HistoryList({
  rows,
  empty,
  render,
}: {
  rows: Array<Record<string, unknown>>;
  empty: string;
  render: (row: Record<string, unknown>) => React.ReactNode;
}) {
  if (!rows.length) return <p className="py-8 text-sm text-muted">{empty}</p>;
  return <div className="divide-y divide-border rounded-xl bg-surface px-4 shadow-[var(--shadow-border)]">{rows.map((r, i) => <div key={String(r.id ?? i)}>{render(r)}</div>)}</div>;
}
