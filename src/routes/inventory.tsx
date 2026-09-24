import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listInventory, moveStock } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["inventory"], queryFn: () => listInventory() });
  const mut = useMutation({
    mutationFn: (d: { spare_id: string; movement_type: string; qty: number }) => moveStock({ data: d }),
    onSuccess: () => {
      toast.success("Stock updated");
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const spares = q.data?.spares ?? [];
  const movements = q.data?.movements ?? [];

  return (
    <div>
      <PageHeader eyebrow="Stores" title="Spare parts" description="Minimum stock alerts fire when an issue drops a line to reorder point." />
      <TableWrap>
        <thead>
          <tr>
            <Th>Part</Th>
            <Th>Stock</Th>
            <Th>Min</Th>
            <Th>Location</Th>
            <Th className="text-right">Unit</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {spares.map((s) => {
            const low = Number(s.current_stock) <= Number(s.min_stock);
            return (
              <tr key={String(s.id)} className={low ? "bg-danger-soft/40" : ""}>
                <Td>
                  <div className="font-medium">{String(s.name)}</div>
                  <div className="font-mono text-[11px] text-muted">{String(s.part_number)}</div>
                </Td>
                <Td className="tabular-nums font-medium">{String(s.current_stock)} {String(s.unit)}</Td>
                <Td className="tabular-nums text-xs">{String(s.min_stock)}</Td>
                <Td className="text-xs">{String(s.location ?? "")}</Td>
                <Td className="text-right tabular-nums">{formatInr(Number(s.unit_cost ?? 0))}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => mut.mutate({ spare_id: String(s.id), movement_type: "issue", qty: 1 })}>Issue</Button>
                    <Button size="sm" variant="ghost" onClick={() => mut.mutate({ spare_id: String(s.id), movement_type: "purchase", qty: 1 })}>+1</Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      <h2 className="mb-2 mt-8 font-display text-lg font-semibold">Recent movements</h2>
      <ul className="space-y-2 text-sm">
        {movements.map((m) => (
          <li key={String(m.id)} className="rounded-lg bg-surface px-4 py-2 shadow-[var(--shadow-border)]">
            {String(m.movement_type)} · {String(m.spare_name)} × {String(m.qty)} · {String(m.staff_name ?? "")}
          </li>
        ))}
      </ul>
    </div>
  );
}
