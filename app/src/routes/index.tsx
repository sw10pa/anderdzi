import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import logoTextNarrow from "@/assets/logo-text-narrow.png";
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
import { useSplash } from "@/components/anderdzi/SplashScreen";
import { Logo } from "@/components/anderdzi/Logo";

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
  const phase = useSplash();
  const splashing = phase !== "done";

  const [navVisible, setNavVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setNavVisible(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (connected && !vaultLoading) navigate({ to: vault ? "/dashboard" : "/create" });
  }, [connected, vault, vaultLoading, navigate]);

  return (
    <div className="flex flex-col">
      {/* Fixed background grid — bottom 1/3 of viewport */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0"
        style={{ height: "33.33vh" }}
      >
        <img
          src="/background-grid.png"
          alt=""
          className="w-full object-contain object-bottom absolute bottom-0 left-0"
          style={{ opacity: 0.7 }}
        />
      </div>

      {/* Sticky oval header — hidden until scroll */}
      <header
        className="fixed top-4 left-0 right-0 z-50 mx-auto max-w-[900px] px-4 transition-all duration-500"
        style={{
          opacity: navVisible ? 1 : 0,
          transform: navVisible ? "translateY(0)" : "translateY(-120%)",
          pointerEvents: navVisible ? "auto" : "none",
        }}
      >
        <div
          className="glass-nav flex flex-col items-center gap-1.5 px-5 py-2.5"
          style={{ borderRadius: "var(--r)" }}
        >
          <img
            src={logoTextNarrow}
            alt="Anderdzi"
            className="block object-contain"
            style={{ height: 26 }}
          />
          <PillButton icon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setVisible(true)}>
            Connect Wallet
          </PillButton>
        </div>
      </header>

      {/* Hero section */}
      <div
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4"
        style={{ paddingBottom: "10vh" }}
      >
        {/* 1) Logo with text */}
        <div
          className="splash-hero-logo"
          style={{
            clipPath: splashing && phase === "spin" ? "inset(0 0 33% 0)" : "inset(0 0 0% 0)",
            animation:
              splashing && phase === "spin" ? "splashSpin 1.8s ease-in-out forwards" : "none",
            transform: phase !== "spin" ? "rotate(360deg)" : undefined,
            transformOrigin: "51.5% 51%",
            transition: phase !== "spin" ? "clip-path 0.8s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          }}
        >
          <Logo size={320} withText variant="white" />
        </div>

        <div
          className="splash-content flex flex-col items-center"
          style={{
            opacity: splashing && phase !== "settle" ? 0 : 1,
            transform: splashing && phase !== "settle" ? "translateY(20px)" : "translateY(0)",
            transition: "opacity 1.2s ease, transform 1.2s ease",
          }}
        >
          {/* 2) Buttons — closer to logo */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
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

          {/* 3) Features */}
          <div className="mt-10 mx-auto grid w-full max-w-[900px] grid-cols-2 gap-3 px-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass-card glass-card-hover flex flex-col items-center gap-2 p-4 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left cursor-default"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r)] glass-inner-accent">
                  <f.icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
                </span>
                <span className="text-sm font-normal text-[var(--text)]">{f.title}</span>
              </div>
            ))}
          </div>

          {/* 4) Slogan */}
          <p
            className="mt-10 text-center text-2xl font-thin tracking-tight text-[var(--text)] sm:text-3xl"
            style={{ fontFamily: '"Normalidad Text", sans-serif', letterSpacing: "-0.01em" }}
          >
            Your Assets. Your Will.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div
        ref={stepsRef}
        className="relative z-10 mx-auto w-full max-w-[900px] px-4 py-16"
        style={{ scrollMarginTop: "90px" }}
      >
        <h2
          className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
        >
          How It Works
        </h2>
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="glass-card glass-card-hover flex items-start gap-4 p-5 cursor-default"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r)] glass-inner-accent text-sm font-bold"
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
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
