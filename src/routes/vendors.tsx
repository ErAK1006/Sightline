import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listVendors } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { formatHours, formatNumber } from "@/lib/utils";

export const Route = createFileRoute("/vendors")({ component: Page });

function Page() {
  const q = useQuery({ queryKey: ["vendors"], queryFn: () => listVendors() });
  return (
    <div>
      <PageHeader eyebrow="Partners" title="Vendors" description="AMC partners, on-call biomedical, HVAC, electrical, fire, and water." />
      <TableWrap>
        <thead>
          <tr>
            <Th>Vendor</Th>
            <Th>Category</Th>
            <Th>SLA</Th>
            <Th>Score</Th>
            <Th>Avg response</Th>
            <Th>Contracts</Th>
          </tr>
        </thead>
        <tbody>
          {(q.data ?? []).map((v) => (
            <tr key={String(v.id)}>
              <Td>
                <div className="font-medium">{String(v.name)}</div>
                <div className="text-xs text-muted">{String(v.contact_person)} · {String(v.phone)}</div>
              </Td>
              <Td className="text-xs">{String(v.service_category)}</Td>
              <Td className="text-xs">{v.sla_hours ? `${v.sla_hours}h` : "—"}</Td>
              <Td className="tabular-nums">{formatNumber(Number(v.performance_score ?? 0), 0)}</Td>
              <Td className="text-xs">{formatHours(Number(v.avg_response ?? 0))}</Td>
              <Td className="tabular-nums">{String(v.contract_count)}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
