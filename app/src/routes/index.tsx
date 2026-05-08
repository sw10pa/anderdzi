import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  Wallet,
  ListChecks,
  ShieldCheck,
  ArrowDownUp,
  Users,
  Activity,
  TrendingUp,
  Bell,
} from "lucide-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useVaultStore } from "@/store/useVaultStore";
import { PillButton } from "@/components/anderdzi/Primitives";
import { Footer } from "@/components/anderdzi/Footer";

export const Route = createFileRoute("/")({
  component: Index,
});

const FEATURES = [
  { icon: ShieldCheck, title: "Secure & Trustless" },
  { icon: ArrowDownUp, title: "Deposit & Withdraw Anytime" },
  { icon: Activity, title: "Automatic Activity Detection" },
  { icon: TrendingUp, title: "Earn Yield with Staking" },
  { icon: Bell, title: "Receive Telegram Notifications" },
  { icon: Users, title: "Automatic Distribution to Beneficiaries" },
];

const STEPS = [
  { t: "Create a Vault", d: "Set your inactivity and grace periods, make an initial deposit." },
  { t: "Add Beneficiaries", d: "Up to 10 wallets with custom percentage splits." },
  { t: "Enable Staking", d: "Your SOL earns yield via Marinade while it waits." },
  { t: "Get Notified", d: "Telegram alerts at 30d, 7d, and 1d remind you to check in." },
  { t: "Grace Period", d: "One last chance to cancel before distribution." },
  { t: "Auto-Distribute", d: "Assets split proportionally to your beneficiaries." },
];

function Index() {
  const navigate = useNavigate();
  const { connected, vault, vaultLoading } = useVaultStore();
  const { setVisible } = useWalletModal();
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connected && !vaultLoading) navigate({ to: vault ? "/dashboard" : "/create" });
  }, [connected, vault, vaultLoading, navigate]);

  return (
    <div className="flex flex-col">
      {/* Part 1: Hero */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1
          className="text-6xl font-bold tracking-tight sm:text-7xl"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.04em" }}
        >
          ANDERDZI
        </h1>
        <p className="mt-5 max-w-md text-center text-lg text-[var(--text-muted)] sm:text-xl">
          <span className="block">Your assets. Your rules.</span>
          <span className="block">Even after you're gone.</span>
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <PillButton icon={<Wallet className="h-4 w-4" />} onClick={() => setVisible(true)}>
            Connect Wallet
          </PillButton>
          <PillButton
            variant="secondary"
            icon={<ListChecks className="h-4 w-4" />}
            onClick={() => stepsRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            How It Works
          </PillButton>
        </div>

        {/* Features */}
        <div className="mt-12 mx-auto grid w-full max-w-[900px] grid-cols-2 gap-3 px-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card flex flex-col items-center gap-2 p-4 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r)] bg-[var(--accent-dim)]">
                <f.icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
              </span>
              <span className="text-sm font-semibold text-[var(--text)]">{f.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Part 2: How It Works */}
      <div ref={stepsRef} className="mx-auto w-full max-w-[900px] px-4 py-16">
        <h2
          className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
        >
          How It Works
        </h2>
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <div key={i} className="glass-card flex items-start gap-4 p-5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r)] bg-[var(--accent-dim)] text-sm font-bold"
                style={{ color: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div
                  className="text-base font-semibold text-[var(--text)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.t}
                </div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
