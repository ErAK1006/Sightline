import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAudit, listStaff, updateStaff } from "@/lib/hospital/actions";
import { PageHeader } from "@/components/hospital/page-header";
import { useHospital } from "@/components/layout/hospital-app";
import { ROLE_LABEL, ROLES, can } from "@/lib/hospital/roles";
import { Select } from "@/components/ui/select";
import { TableWrap, Th, Td } from "@/components/hospital/table";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";

export const Route = createFileRoute("/settings")({ component: Page });

function Page() {
  const { staff, hospital } = useHospital();
  const qc = useQueryClient();
  const people = useQuery({ queryKey: ["staff"], queryFn: () => listStaff() });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => listAudit() });
  const mut = useMutation({
    mutationFn: (d: { id: string; role?: string; view_as_role?: string | null }) => updateStaff({ data: d }),
    onSuccess: () => {
      toast.success("Updated");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const admin = can(staff.role, "staff.admin") || staff.role === "facility_manager";

  return (
    <div>
      <PageHeader eyebrow="Hospital" title="Settings" description={`${hospital.name} · ${hospital.campus} · ${hospital.city}`} />
      <section className="mb-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-display text-lg font-semibold">Your session</h2>
        <p className="mt-1 text-sm text-muted">{staff.name} · {staff.email} · {ROLE_LABEL[staff.role]}</p>
        <div className="mt-3 max-w-sm space-y-2">
          <label className="text-sm font-medium">View as role</label>
          <Select
            value={staff.view_as_role ?? ""}
            onChange={(e) => mut.mutate({ id: staff.id, view_as_role: e.target.value || null })}
          >
            <option value="">Actual role ({ROLE_LABEL[staff.role]})</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </Select>
          <p className="text-xs text-muted">Use this to walk a technician or department-user path without a second account.</p>
        </div>
        <div className="mt-4"><UserButton /></div>
      </section>

      {admin && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold">Staff directory</h2>
          <TableWrap>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Department</Th>
                <Th>Role</Th>
              </tr>
            </thead>
            <tbody>
              {(people.data ?? []).map((s) => (
                <tr key={String(s.id)}>
                  <Td>{String(s.name)}</Td>
                  <Td className="text-xs">{String(s.email)}</Td>
                  <Td className="text-xs">{String(s.department_name ?? "")}</Td>
                  <Td>
                    <Select value={String(s.role)} onChange={(e) => mut.mutate({ id: String(s.id), role: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </Select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Audit trail</h2>
        <ul className="space-y-2 text-sm">
          {(audit.data ?? []).map((a) => (
            <li key={String(a.id)} className="rounded-lg bg-surface px-4 py-2 shadow-[var(--shadow-border)]">
              <span className="font-medium">{String(a.staff_name ?? a.user_id)}</span>
              <span className="text-muted"> {String(a.action)} {String(a.entity_type)} </span>
              <span className="font-mono text-xs">{String(a.entity_id)}</span>
              <span className="float-right text-xs text-muted">{formatDateTime(String(a.created_at))}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
