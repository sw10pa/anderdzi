import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut, Wallet } from "lucide-react";
import { useMockStore } from "@/store/useMockStore";
import { truncateAddr } from "./Primitives";
import { Logo } from "./Logo";

export function Navbar() {
  const { connected, walletAddress, disconnect } = useMockStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  if (isLanding) return <div className="h-4" />;
  return (
    <header className="mx-auto flex w-full max-w-[520px] items-center justify-between gap-3 px-5 py-5">
      <Link to="/" className="inline-flex items-center">
        <Logo size={64} withText />
      </Link>
      {connected && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-[var(--r)] border border-[var(--border)] bg-[rgba(15,57,50,0.6)] py-1.5 pl-2 pr-3 backdrop-blur-md">
            <span className="flex h-6 w-6 items-center justify-center rounded-[var(--r)] bg-[var(--accent-dim)]">
              <Wallet className="h-3 w-3" style={{ color: "var(--accent)" }} />
            </span>
            <span className="font-mono text-xs font-medium text-[var(--text)]">
              {truncateAddr(walletAddress ?? "", 4, 4)}
            </span>
          </div>
          <button
            onClick={() => { disconnect(); navigate({ to: "/" }); }}
            className="inline-flex items-center gap-1.5 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 transition-colors"
            aria-label="Disconnect"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </header>
  );
}