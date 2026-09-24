import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listContracts } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { StatusBadge } from "@/components/hospital/status-badge";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { formatDate, formatInr } from "@/lib/utils";

export const Route = createFileRoute("/contracts")({ component: Page });

function Page() {
  const q = useQuery({ queryKey: ["contracts"], queryFn: () => listContracts() });
  return (
    <div>
      <PageHeader eyebrow="Coverage" title="AMC / CMC" description="Alerts at 30 / 15 / 7 days. Expiring contracts sit at the top." />
      <TableWrap>
        <thead>
          <tr>
            <Th>Contract</Th>
            <Th>Asset</Th>
            <Th>Vendor</Th>
            <Th>Type</Th>
            <Th>End</Th>
            <Th className="text-right">Value</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {(q.data ?? []).map((c) => {
            const days = Number(c.days_left);
            const tone = days < 0 ? "expired" : days <= 30 ? "due" : "active";
            return (
              <tr key={String(c.id)}>
                <Td className="font-mono text-xs">{String(c.contract_number)}</Td>
                <Td>
                  <div className="font-mono text-xs">{String(c.asset_code ?? "—")}</div>
                  <div className="text-xs text-muted">{String(c.asset_name ?? "")}</div>
                </Td>
                <Td className="text-sm">{String(c.vendor_name)}</Td>
                <Td>{String(c.contract_type)}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(String(c.end_date))}</Td>
                <Td className="text-right tabular-nums">{formatInr(Number(c.contract_value ?? 0))}</Td>
                <Td><StatusBadge value={tone} /></Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </div>
  );
}
