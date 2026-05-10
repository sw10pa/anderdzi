import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MOCK_ENABLED, type VaultStateKey } from "@/lib/mock";
import { useMockStore } from "@/store/useMockStore";
import { useNavigate } from "@tanstack/react-router";

const STATES: VaultStateKey[] = ["ACTIVE", "TRIGGERED", "NO_STAKING", "NO_VAULT", "DISCONNECTED"];

export function MockSwitcher() {
  const [open, setOpen] = useState(false);
  const { vaultState, setVaultState } = useMockStore();
  const navigate = useNavigate();
  if (!MOCK_ENABLED) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="pill flex items-center gap-2 border border-[var(--border)] glass-nav px-3 py-1.5 text-xs font-semibold text-[var(--text)]"
      >
        Mock: {vaultState} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1 rounded-xl glass-dialog p-2 shadow-xl">
          {STATES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setVaultState(s);
                setOpen(false);
                if (s === "DISCONNECTED") navigate({ to: "/" });
                else if (s === "NO_VAULT") navigate({ to: "/create" });
                else navigate({ to: "/dashboard" });
              }}
              className="rounded-lg px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(74,255,145,0.2)] transition-all duration-200"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
