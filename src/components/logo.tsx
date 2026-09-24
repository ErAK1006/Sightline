import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-primary" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#F3EFE6" strokeWidth="1.75" />
      <circle cx="16" cy="16" r="4.5" fill="none" stroke="#F3EFE6" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="1.6" fill="#F3EFE6" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="min-w-0 leading-tight">
        <div className="font-display text-lg font-semibold tracking-tight">Sightline</div>
        {!compact && <div className="text-[11px] font-medium uppercase tracking-[0.14em] opacity-70">Helios Eye Hospital</div>}
      </div>
    </div>
  );
}
