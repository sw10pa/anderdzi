import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Navbar } from "@/components/anderdzi/Navbar";
import { MockSwitcher } from "@/components/anderdzi/MockSwitcher";
import { WalletProvider } from "@/providers/WalletProvider";

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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <div className="min-h-screen">
          <Navbar />
          <main className="mx-auto w-full max-w-[520px] px-4 pb-24">
            <Outlet />
          </main>
          <MockSwitcher />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(31, 69, 60, 0.95)",
                border: "1px solid rgba(241,241,241,0.08)",
                color: "#F1F1F1",
                borderRadius: "12px",
                backdropFilter: "blur(20px)",
              },
            }}
          />
        </div>
      </WalletProvider>
    </QueryClientProvider>
  );
}
