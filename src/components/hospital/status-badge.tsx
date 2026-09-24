import { Badge } from "@/components/ui/badge";
import { STATUS_TONE, PRIORITY_TONE, labelize } from "@/lib/hospital/roles";

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted">—</span>;
  const tone = STATUS_TONE[value] ?? "neutral";
  return <Badge tone={tone}>{labelize(value)}</Badge>;
}

export function PriorityBadge({ value }: { value?: string | null }) {
  if (!value) return null;
  const tone = PRIORITY_TONE[value as keyof typeof PRIORITY_TONE] ?? "neutral";
  return <Badge tone={tone}>{labelize(value)}</Badge>;
}
