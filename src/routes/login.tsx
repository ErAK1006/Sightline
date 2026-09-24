import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/logo";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">Opening Sightline…</div>;
  }
  if (user) return <Navigate to="/" />;

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message);
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-bg lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-sidebar text-sidebar-fg lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <div className="font-display text-2xl font-semibold">Sightline</div>
            <div className="text-xs uppercase tracking-[0.16em] text-sidebar-muted">Helios Eye Hospital</div>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            The operating theatre of the building.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-muted">
            One register for assets, breakdowns, preventive maintenance, utilities, and compliance — built for an eye hospital floor, not a generic CMMS.
          </p>
        </div>
        <p className="text-xs text-sidebar-muted">Jayanagar campus · Engineering & facilities</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <LogoMark />
              <div>
                <div className="font-display text-xl font-semibold">Sightline</div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Helios Eye Hospital</div>
              </div>
            </div>
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Staff access for operations and maintenance.</p>

          {authEnabled ? (
            <div className="mt-6 space-y-3">
              <form className="space-y-3" onSubmit={onEmail}>
                {mode === "up" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Please wait…" : mode === "up" ? "Create account" : "Sign in"}
                </Button>
              </form>
              <button
                type="button"
                className="w-full text-center text-sm text-muted hover:text-fg"
                onClick={() => setMode(mode === "in" ? "up" : "in")}
              >
                {mode === "in" ? "New staff member? Create an account" : "Already have an account? Sign in"}
              </button>
              <p className="text-xs leading-relaxed text-muted">
                Matching a Helios staff email claims that role. First signed-in user becomes Super Admin.
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
      </section>
    </main>
  );
}
