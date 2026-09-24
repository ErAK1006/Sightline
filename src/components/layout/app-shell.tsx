import { useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarCheck,
  ClipboardList,
  Droplets,
  FileText,
  Flame,
  LayoutDashboard,
  Menu,
  Package,
  QrCode,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { can, ROLE_LABEL, type Perm } from "@/lib/hospital/roles";
import type { Bootstrap } from "@/lib/hospital/types";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn, initials } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; perm: Perm };

const PRIMARY: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" },
  { to: "/breakdowns", label: "Breakdowns", icon: AlertTriangle, perm: "breakdowns" },
  { to: "/work-orders", label: "Work orders", icon: ClipboardList, perm: "work_orders" },
  { to: "/pm", label: "Preventive", icon: CalendarCheck, perm: "pm" },
  { to: "/assets", label: "Assets", icon: Activity, perm: "assets" },
  { to: "/scan", label: "Scan QR", icon: QrCode, perm: "assets" },
];

const SECONDARY: NavItem[] = [
  { to: "/logbooks", label: "Logbooks", icon: FileText, perm: "logbooks" },
  { to: "/inspections", label: "Inspections", icon: ClipboardList, perm: "inspections" },
  { to: "/utilities", label: "Utilities", icon: Zap, perm: "utilities" },
  { to: "/inventory", label: "Inventory", icon: Package, perm: "inventory" },
  { to: "/vendors", label: "Vendors", icon: Truck, perm: "vendors" },
  { to: "/contracts", label: "AMC / CMC", icon: FileText, perm: "contracts" },
  { to: "/calibration", label: "Calibration", icon: Activity, perm: "calibration" },
  { to: "/safety", label: "Fire & safety", icon: Flame, perm: "safety" },
  { to: "/housekeeping", label: "Housekeeping", icon: Sparkles, perm: "housekeeping" },
  { to: "/incidents", label: "Incidents", icon: ShieldAlert, perm: "incidents" },
  { to: "/reports", label: "Reports", icon: FileText, perm: "reports" },
  { to: "/documents", label: "Documents", icon: FileText, perm: "documents" },
];

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = item.to === "/" ? pathname === "/" : pathname === item.to || pathname.startsWith(`${item.to}/`);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-sidebar-active text-primary-fg" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function SideNav({ boot, onNavigate }: { boot: Bootstrap; onNavigate?: () => void }) {
  const role = boot.staff.effective_role;
  const filter = (items: NavItem[]) => items.filter((i) => can(role, i.perm));
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <div className="text-sidebar-fg">
          <Wordmark />
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        <div className="space-y-1">
          {filter(PRIMARY).map((item) => (
            <NavLink key={item.to} item={item} onClick={onNavigate} />
          ))}
        </div>
        <div>
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">Operations</div>
          <div className="space-y-1">
            {filter(SECONDARY).map((item) => (
              <NavLink key={item.to} item={item} onClick={onNavigate} />
            ))}
          </div>
        </div>
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg">
            {initials(boot.staff.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-sidebar-fg">{boot.staff.name}</div>
            <div className="truncate text-[11px] text-sidebar-muted">{ROLE_LABEL[role]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ boot, children }: { boot: Bootstrap; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bottom = useMemo(
    () =>
      [
        { to: "/", label: "Home", icon: LayoutDashboard },
        { to: "/breakdowns", label: "Tickets", icon: AlertTriangle },
        { to: "/scan", label: "Scan", icon: QrCode },
        { to: "/work-orders", label: "Work", icon: Wrench },
      ] as const,
    [],
  );

  return (
    <div className="min-h-dvh bg-bg text-fg lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="hidden bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <SideNav boot={boot} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur-md lg:h-16 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <form
            className="relative min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) window.location.assign(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search assets, tickets, vendors…"
              className="h-10 border-transparent bg-surface pl-9 shadow-[var(--shadow-border)]"
            />
          </form>
          <Link to="/notifications" className="relative grid size-11 place-items-center rounded-md hover:bg-surface-2">
            <Bell className="size-5" />
            {boot.unread > 0 && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-danger" />
            )}
          </Link>
          <Link to="/settings" className="hidden size-11 place-items-center rounded-md hover:bg-surface-2 sm:grid">
            <Settings className="size-5" />
          </Link>
          <div className="hidden sm:block">
            {isPending ? <div className="size-8 animate-pulse rounded-full bg-surface-2" /> : user ? <UserButton /> : null}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-8 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {bottom.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className="flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted">
          <Menu className="size-5" />
          More
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-sidebar p-0 text-sidebar-fg">
          <SideNav boot={boot} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
