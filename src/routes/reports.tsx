import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listReports } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { Button } from "@/components/ui/button";
import { downloadCsv, formatHours, formatInr } from "@/lib/utils";
import { TableWrap, Th, Td } from "@/components/hospital/table";

export const Route = createFileRoute("/reports")({ component: Page });

function Page() {
  const q = useQuery({ queryKey: ["reports"], queryFn: () => listReports() });
  const data = q.data;
  return (
    <div>
      <PageHeader
        eyebrow="Management"
        title="Reports"
        description="Download CSV for Excel, or print this page for a PDF monthly pack."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => data && downloadCsv("breakdowns.csv", data.breakdowns as Record<string, unknown>[])}>Breakdowns CSV</Button>
            <Button variant="outline" onClick={() => data && downloadCsv("pm.csv", data.pm as Record<string, unknown>[])}>PM CSV</Button>
            <Button variant="outline" onClick={() => window.print()}>Print / PDF</Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {(data?.costs ?? []).map((c) => (
          <div key={String(c.month)} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="text-xs uppercase tracking-wider text-muted">{String(c.month)}</div>
            <div className="mt-1 font-display text-xl font-semibold tabular-nums">{formatInr(Number(c.cost))}</div>
            <div className="text-xs text-muted">{formatHours(Number(c.downtime))} downtime</div>
          </div>
        ))}
      </div>
      <h2 className="mb-2 mt-8 font-display text-lg font-semibold">Highest breakdown assets</h2>
      <TableWrap>
        <thead>
          <tr>
            <Th>Asset</Th>
            <Th>Events</Th>
            <Th>Downtime</Th>
            <Th className="text-right">Cost</Th>
          </tr>
        </thead>
        <tbody>
          {(data?.downtime ?? []).map((a) => (
            <tr key={String(a.asset_code)}>
              <Td>
                <div className="font-mono text-xs">{String(a.asset_code)}</div>
                <div>{String(a.name)}</div>
              </Td>
              <Td className="tabular-nums">{String(a.total_breakdown_count)}</Td>
              <Td>{formatHours(Number(a.total_downtime_minutes))}</Td>
              <Td className="text-right tabular-nums">{formatInr(Number(a.maintenance_cost))}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
