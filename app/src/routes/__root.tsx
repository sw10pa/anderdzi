import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useLocation } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Navbar } from "@/components/anderdzi/Navbar";
import { Footer } from "@/components/anderdzi/Footer";
import { WalletProvider } from "@/providers/WalletProvider";
import { useWalletSync } from "@/hooks/useWalletSync";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function WalletSync() {
  useWalletSync();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <WalletSync />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className={`mx-auto w-full ${isLanding ? "" : "max-w-[900px]"} flex-1 px-4`}>
            <Outlet />
          </main>
          {!isLanding && <Footer />}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "var(--r)",
                backdropFilter: "blur(20px)",
              },
              classNames: {
                description: "!text-[var(--text-muted)]",
              },
            }}
          />
        </div>
      </WalletProvider>
    </QueryClientProvider>
  );
}
