import { useQuery } from "@tanstack/react-query";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getBootstrap } from "@/lib/hospital/actions";
import { AppShell } from "./app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import type { Bootstrap } from "@/lib/hospital/types";
import { createContext, useContext } from "react";

const Ctx = createContext<Bootstrap | null>(null);

export function useHospital() {
  const v = useContext(Ctx);
  if (!v) throw new Error("Hospital context missing");
  return v;
}

export function HospitalApp({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const boot = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    enabled: !isPending && !!user,
    retry: false,
  });

  if (isPending || (user && boot.isPending)) {
    return (
      <div className="min-h-dvh bg-bg p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user) return <RedirectToSignIn />;
  if (boot.error) {
    const msg = boot.error instanceof Error ? boot.error.message : "Unable to load";
    if (msg === "Unauthorized") return <RedirectToSignIn />;
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <h1 className="font-display text-xl">Sightline could not load</h1>
          <p className="mt-2 text-sm text-muted">{msg}</p>
        </div>
      </div>
    );
  }
  if (!boot.data) return null;

  return (
    <Ctx.Provider value={boot.data}>
      <AppShell boot={boot.data}>{children}</AppShell>
    </Ctx.Provider>
  );
}
