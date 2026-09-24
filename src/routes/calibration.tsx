import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listCalibrations } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge } from "@/components/hospital/status-badge";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/calibration")({ component: Page });

function Page() {
  const q = useQuery({ queryKey: ["cal"], queryFn: () => listCalibrations() });
  const today = "2026-09-22";
  return (
    <div>
      <PageHeader eyebrow="Metrology" title="Calibration" description="NABL / OEM certificates for diagnostic and OT equipment." />
      <TableWrap>
        <thead>
          <tr>
            <Th>Asset</Th>
            <Th>Standard</Th>
            <Th>Agency</Th>
            <Th>Certificate</Th>
            <Th>Due</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {(q.data ?? []).map((c) => {
            const due = String(c.due_date).slice(0, 10);
            const state = due < today ? "overdue" : due <= "2026-10-22" ? "due" : "active";
            return (
              <tr key={String(c.id)}>
                <Td>
                  <div className="font-mono text-xs">{String(c.asset_code)}</div>
                  <div className="text-sm">{String(c.asset_name)}</div>
                </Td>
                <Td className="text-xs">{String(c.standard_name ?? "")}</Td>
                <Td className="text-xs">{String(c.agency ?? "")}</Td>
                <Td className="font-mono text-xs">{String(c.certificate_number ?? "")}</Td>
                <Td className="text-xs">{formatDate(due)}</Td>
                <Td><StatusBadge value={state} /></Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </div>
  );
}
