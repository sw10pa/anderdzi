import { useNavigate } from "@tanstack/react-router";
import { LogOut, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { truncateAddr } from "./Primitives";

export function Navbar() {
  const { connected, publicKey, disconnect } = useWallet();
  const navigate = useNavigate();
  const isLanding = typeof window !== "undefined" && window.location.pathname === "/";
  if (isLanding) return <div className="h-4" />;

  return (
    <header className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-5 py-5">
      {connected && publicKey ? (
        <>
          <div className="inline-flex h-9 items-center gap-2 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] pl-2 pr-3 backdrop-blur-md">
            <span className="flex h-6 w-6 items-center justify-center rounded-[var(--r)] bg-[var(--accent-dim)]">
              <Wallet className="h-3 w-3" style={{ color: "var(--accent)" }} />
            </span>
            <span className="font-mono text-xs font-medium text-[var(--text)]">
              {truncateAddr(publicKey.toBase58(), 4, 4)}
            </span>
          </div>
          <button
            onClick={() => {
              disconnect();
              navigate({ to: "/" });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 transition-colors"
            aria-label="Disconnect"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </>
      ) : (
        <div />
      )}
    </header>
  );
}
