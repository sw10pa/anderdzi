import { useNavigate } from "@tanstack/react-router";
import { LogOut, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { truncateAddr } from "@/lib/utils";
import logoTextNarrow from "@/assets/logo-text-narrow.png";

export function Navbar() {
  const { connected, publicKey, disconnect } = useWallet();
  const navigate = useNavigate();
  const isLanding = typeof window !== "undefined" && window.location.pathname === "/";

  if (isLanding) return null;

  return (
    <header className="fixed top-4 left-0 right-0 z-50 mx-auto max-w-[900px] px-4">
      <div
        className="glass-nav flex items-center justify-between px-5 py-5"
        style={{ borderRadius: "var(--r)" }}
      >
        {/* Left: wallet address */}
        {connected && publicKey ? (
          <div className="inline-flex h-9 items-center gap-2 rounded-[var(--r)] glass-inner pl-2 pr-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-[var(--r)] glass-inner-accent">
              <Wallet className="h-2.5 w-2.5" style={{ color: "var(--accent)" }} />
            </span>
            <span className="font-mono text-xs font-medium text-[var(--text)]">
              {truncateAddr(publicKey.toBase58(), 4, 4)}
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Center: logo */}
        <img
          src={logoTextNarrow}
          alt="Anderdzi"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 block object-contain"
          style={{ height: 26 }}
        />

        {/* Right: disconnect */}
        {connected && publicKey ? (
          <button
            onClick={() => {
              disconnect();
              navigate({ to: "/" });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r)] glass-inner px-3 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
            aria-label="Disconnect"
          >
            <LogOut className="h-3 w-3" />
            Disconnect
          </button>
        ) : (
          <div />
        )}
      </div>
    </header>
  );
}
