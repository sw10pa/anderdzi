import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Wallet, ListChecks, ShieldCheck, ArrowDownUp, Users, Activity, TrendingUp, Bell } from "lucide-react";
import { useMockStore } from "@/store/useMockStore";
import { PillButton } from "@/components/anderdzi/Primitives";
import { Logo } from "@/components/anderdzi/Logo";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  component: Index,
});

const FEATURES = [
  { icon: ShieldCheck, title: "Secure & Trustless", desc: "Non-custodial vaults secured by Solana smart contracts." },
  { icon: ArrowDownUp, title: "Deposit & Withdraw Anytime", desc: "Your SOL stays liquid — move funds whenever you need." },
  { icon: Users, title: "Automatic Distribution", desc: "Assets split to beneficiaries by your custom percentages." },
  { icon: Activity, title: "Automatic Activity Detection", desc: "On-chain watcher resets your timer silently." },
  { icon: TrendingUp, title: "Earn Yield with Staking", desc: "Optional Marinade liquid staking on idle balance." },
  { icon: Bell, title: "Telegram Notifications", desc: "Reminders at 30d, 7d, and 1d before trigger." },
];

const STEPS = [
  { t: "Create a Vault", d: "Set your inactivity period, grace period, and make an initial deposit." },
  { t: "Add Beneficiaries", d: "Designate up to 10 wallets with custom percentage splits." },
  { t: "Enable Staking", d: "Your SOL earns yield via Marinade Finance while it waits." },
  { t: "Live Your Life", d: "Use Solana normally. Your activity is detected automatically and the timer resets silently." },
  { t: "Get Notified", d: "Going inactive? Telegram alerts at 30d, 7d, and 1d remind you to check in." },
  { t: "Grace Period", d: "Missed all reminders? You get one last chance to cancel." },
  { t: "Auto-Distribute", d: "Grace period expires. Assets split proportionally to your beneficiaries — fully automatic." },
];

function Index() {
  const navigate = useNavigate();
  const { connected, vault, connect } = useMockStore();
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connected) navigate({ to: vault ? "/dashboard" : "/create" });
  }, [connected, vault, navigate]);

  return (
    <div className="anim-fade-up flex flex-col items-center pt-8 pb-12">
      {/* Hero */}
      <Logo size={88} />
      <h1 className="mt-5 text-4xl font-bold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.03em" }}>Anderdzi</h1>
      <p className="mt-3 max-w-sm text-center text-sm text-[var(--text-muted)]">
        <span className="block">Your assets. Your rules.</span>
        <span className="block">Even after you're gone.</span>
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <PillButton icon={<Wallet className="h-4 w-4" />} onClick={() => { connect(); navigate({ to: "/dashboard" }); }}>
          Connect Wallet
        </PillButton>
        <PillButton variant="secondary" icon={<ListChecks className="h-4 w-4" />} onClick={() => stepsRef.current?.scrollIntoView({ behavior: "smooth" })}>
          How it works
        </PillButton>
      </div>

      {/* Features */}
      <div className="mt-12 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r)] bg-[var(--accent-dim)]">
                <f.icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text)]">{f.title}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{f.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div ref={stepsRef} className="mt-12 w-full scroll-mt-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.02em" }}>How it works</h2>
        <div className="glass-card p-2">
          <Accordion type="single" collapsible className="w-full">
            {STEPS.map((s, i) => (
              <AccordionItem key={i} value={`s-${i}`} className="border-b border-[var(--border)] last:border-b-0 px-3">
                <AccordionTrigger className="hover:no-underline py-3">
                  <span className="flex items-center gap-3 text-left">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r)] bg-[var(--accent-dim)] text-xs font-semibold" style={{ color: "var(--accent)" }}>{i + 1}</span>
                    <span className="text-sm font-medium text-[var(--text)]">{s.t}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-9 pr-2 text-xs text-[var(--text-muted)]">{s.d}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 flex w-full flex-col items-center gap-3 border-t border-[var(--border)] pt-6">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Follow us:</span>
          <a href="https://github.com/sw10pa/anderdzi" target="_blank" rel="noreferrer" aria-label="GitHub" className="flex h-8 w-8 items-center justify-center rounded-[var(--r)] bg-[var(--surface-2)] text-[var(--text)] transition-colors hover:text-[var(--accent)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/></svg>
          </a>
          <a href="https://x.com/anderdzi" target="_blank" rel="noreferrer" aria-label="X" className="flex h-8 w-8 items-center justify-center rounded-[var(--r)] bg-[var(--surface-2)] text-[var(--text)] transition-colors hover:text-[var(--accent)]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M18.244 2H21l-6.52 7.45L22 22h-6.797l-4.77-6.231L4.8 22H2.04l6.974-7.97L2 2h6.914l4.31 5.7L18.244 2zm-1.19 18h1.652L7.05 4H5.27l11.784 16z"/></svg>
          </a>
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">© {new Date().getFullYear()} Anderdzi. All rights reserved.</div>
      </footer>
    </div>
  );
}
