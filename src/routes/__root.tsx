import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { HospitalApp } from "@/components/layout/hospital-app";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "Sightline";

function getQueryClient() {
  const g = globalThis as typeof globalThis & { __sightlineQc?: QueryClient };
  if (!g.__sightlineQc) {
    g.__sightlineQc = new QueryClient({
      defaultOptions: { queries: { staleTime: 8_000, refetchOnWindowFocus: false, retry: 1 } },
    });
  }
  return g.__sightlineQc;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0F5E57" },
      { name: "description", content: "Sightline — operations and maintenance for Helios Eye Hospital." },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: Root,
});

function Root() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = pathname === "/login";
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <QueryClientProvider client={getQueryClient()}>
          <AuthProvider>
            {isPublic ? <Outlet /> : <HospitalApp><Outlet /></HospitalApp>}
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
