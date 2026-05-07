import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, XCircle, Archive, Info, Pencil, Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, Wallet, TrendingUp } from "lucide-react";
import { useMockStore } from "@/store/useMockStore";
import { Badge, Divider, GlassCard, PillButton, TextInput, Toggle, truncateAddr } from "@/components/anderdzi/Primitives";
import { PercentBadge } from "@/routes/create";
import type { Beneficiary } from "@/lib/mock";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { mockSolBalance } from "@/lib/mock";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Anderdzi" },
      { name: "description", content: "Manage your inheritance vault." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { connected, vault } = useMockStore();

  useEffect(() => {
    if (!connected) navigate({ to: "/" });
    else if (!vault) navigate({ to: "/create" });
  }, [connected, vault, navigate]);

  if (!vault) return null;

  return (
    <div className="flex flex-col gap-4 pt-2">
      <VaultStatusCard />
      <BalanceCard />
      <BeneficiariesCard />
      <SettingsCard />
      <CloseVaultFooter />
    </div>
  );
}

function VaultStatusCard() {
  const { vault, imAlive, cancelTrigger, busy } = useMockStore();
  if (!vault) return null;
  const triggered = vault.status === "TRIGGERED";
  const elapsedPct = triggered
    ? ((vault.gracePeriodDays - (vault.graceRemainingDays ?? 0)) / vault.gracePeriodDays) * 100
    : ((vault.inactivityPeriodDays - vault.daysUntilTrigger) / vault.inactivityPeriodDays) * 100;

  return (
    <GlassCard delay={0}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--text-muted)]">{truncateAddr(vault.address, 6, 6)}</span>
        <Badge kind={vault.status} />
      </div>
      <div className="mt-6 text-center">
        <div className="stat-label">{triggered ? "Grace period remaining" : "Time until trigger"}</div>
        <div className="mt-2 flex items-baseline justify-center gap-2">
          <span className={`text-4xl font-bold ${triggered ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>
            {triggered ? vault.graceRemainingDays : vault.daysUntilTrigger}
          </span>
          <span className="text-sm text-[var(--text-muted)]">days</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(241,241,241,0.08)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${elapsedPct}%`, background: triggered ? "var(--danger)" : "var(--accent)", boxShadow: triggered ? "0 0 12px rgba(255,107,107,0.5)" : "0 0 12px rgba(74,255,145,0.5)" }}
          />
        </div>
        <div className="mt-4 flex justify-center">
          {triggered ? (
            <PillButton variant="danger" icon={<XCircle className="h-4 w-4" />} loading={busy === "cancel"} onClick={() => cancelTrigger()}>
              Cancel Trigger
            </PillButton>
          ) : (
            <PillButton icon={<Heart className="h-4 w-4" />} loading={busy === "imAlive"} onClick={() => imAlive()}>
              I'm Alive
            </PillButton>
          )}
        </div>
      </div>
      <div className="mt-4 text-center text-xs text-[var(--text-muted)]">
        Last activity detected {vault.lastSeenDays} days ago
      </div>
    </GlassCard>
  );
}

function BalanceCard() {
  const { vault } = useMockStore();
  const [mode, setMode] = useState<null | "deposit" | "withdraw">(null);
  if (!vault) return null;

  const fmt = (n: number) => n.toFixed(2);

  return (
    <GlassCard delay={80}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--r)] bg-[rgba(255,255,255,0.03)] border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Deposited</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums">{fmt(vault.deposited)}</span>
            <span className="text-xs font-medium text-[var(--text-muted)]">SOL</span>
          </div>
        </div>
        <div className="rounded-[var(--r)] bg-[rgba(74,255,145,0.04)] border border-[rgba(74,255,145,0.12)] p-4">
          <div className="flex items-center gap-2" style={{ color: vault.stakingEnabled ? "var(--accent)" : "var(--text-muted)" }}>
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Yield</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            {vault.stakingEnabled ? (
              <>
                <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>+{fmt(vault.yield)}</span>
                <span className="text-xs font-medium text-[var(--text-muted)]">SOL</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-[var(--text-muted)]">—</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <PillButton fullWidth icon={<ArrowDownToLine className="h-4 w-4" />} onClick={() => setMode("deposit")}>Deposit</PillButton>
        <PillButton fullWidth variant="secondary" icon={<ArrowUpFromLine className="h-4 w-4" />} onClick={() => setMode("withdraw")}>Withdraw</PillButton>
      </div>
      <AmountDialog mode={mode} onClose={() => setMode(null)} vaultBalance={vault.deposited} walletBalance={mockSolBalance} />
    </GlassCard>
  );
}

function AmountDialog({ mode, onClose, vaultBalance, walletBalance }: { mode: null | "deposit" | "withdraw"; onClose: () => void; vaultBalance: number; walletBalance: number }) {
  const { deposit, withdraw, busy } = useMockStore();
  const [amount, setAmount] = useState("");
  const open = mode !== null;
  const isDeposit = mode === "deposit";
  const max = isDeposit ? walletBalance : vaultBalance;
  const n = Number(amount);
  const invalid = !n || n <= 0 || n > max;

  const submit = async () => {
    if (invalid) return;
    if (isDeposit) await deposit(n);
    else await withdraw(n);
    setAmount("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setAmount(""); onClose(); } }}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text)] sm:max-w-sm rounded-[var(--r)]">
        <DialogHeader>
          <DialogTitle className="card-title">{isDeposit ? "Deposit SOL" : "Withdraw SOL"}</DialogTitle>
          <DialogDescription className="text-[var(--text-muted)]">
            {isDeposit ? `Wallet balance: ${walletBalance.toFixed(2)} SOL` : `Vault balance: ${vaultBalance.toFixed(2)} SOL`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <TextInput
              autoFocus
              type="number"
              className="no-spin pr-14 text-lg text-center"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">SOL</span>
          </div>
          <button onClick={() => setAmount(String(max))} className="text-xs text-[var(--accent)] hover:underline">Use max</button>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <PillButton fullWidth variant="secondary" onClick={onClose}>Cancel</PillButton>
            <PillButton fullWidth disabled={invalid} loading={busy === (isDeposit ? "deposit" : "withdraw")} onClick={submit}>
              {isDeposit ? "Deposit" : "Withdraw"}
            </PillButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CloseVaultFooter() {
  const { vault, closeVault, busy } = useMockStore();
  const [confirm, setConfirm] = useState(false);
  if (!vault || vault.stakingEnabled) return null;
  return (
    <>
      <div className="anim-fade-up mt-2 flex justify-center pb-4" style={{ animationDelay: "400ms" }}>
        <button
          onClick={() => setConfirm(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
        >
          <Archive className="h-3.5 w-3.5" />
          Close vault permanently
        </button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text)] sm:max-w-sm rounded-[var(--r)]">
          <DialogHeader>
            <DialogTitle className="card-title">Close this vault?</DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              This action is permanent. Funds will be returned to your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <PillButton fullWidth variant="secondary" onClick={() => setConfirm(false)}>Cancel</PillButton>
            <PillButton fullWidth variant="danger" loading={busy === "close"} onClick={async () => { await closeVault(); setConfirm(false); }}>
              Close Vault
            </PillButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BeneficiariesCard() {
  const { vault, saveBeneficiaries, busy } = useMockStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Beneficiary[]>([]);

  if (!vault) return null;

  const startEdit = () => { setDraft(vault.beneficiaries.map((b) => ({ ...b }))); setEditing(true); };
  const sum = draft.reduce((s, b) => s + (Number(b.percentage) || 0), 0);
  const valid = sum === 100 && draft.every((b) => b.address.length > 0);

  return (
    <GlassCard delay={240}>
      <div className="flex items-center justify-between">
        <span className="card-title text-left">Beneficiaries</span>
        {!editing ? (
          <button onClick={startEdit} className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        ) : (
          <PercentBadge sum={sum} />
        )}
      </div>

      {!editing ? (
        <div className="mt-4 space-y-3">
          {vault.beneficiaries.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r)] bg-[var(--surface-2)] text-sm font-semibold" style={{ color: "var(--accent)" }}>
                {i + 1}
              </div>
              <span className="flex-1 font-mono text-sm text-[var(--text)]">{truncateAddr(b.address, 6, 6)}</span>
              <span className="rounded-[var(--r)] bg-[var(--accent-dim)] px-2.5 py-0.5 text-xs font-semibold" style={{ color: "var(--accent)" }}>{b.percentage}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {draft.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <TextInput placeholder="Address" value={b.address} onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
              <input
                type="number"
                value={b.percentage}
                onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? { ...x, percentage: Number(e.target.value) } : x))}
                className="input-base no-spin w-20 text-center"
              />
              <button onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--danger)]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {draft.length < 10 && (
            <button onClick={() => setDraft((d) => [...d, { address: "", percentage: 0 }])} className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">
              <Plus className="h-3 w-3" /> Add Beneficiary
            </button>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PillButton fullWidth disabled={!valid} loading={busy === "beneficiaries"} onClick={async () => { await saveBeneficiaries(draft); setEditing(false); }}>Save Changes</PillButton>
            <PillButton fullWidth variant="secondary" onClick={() => setEditing(false)}>Cancel</PillButton>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function SettingsCard() {
  const { vault, setToggle, connectTelegram, busy } = useMockStore();
  const [chatId, setChatId] = useState("");
  const [tgOpen, setTgOpen] = useState(false);
  if (!vault) return null;

  const rows: { key: "watcherEnabled" | "stakingEnabled" | "telegramEnabled"; label: string; info: string }[] = [
    { key: "watcherEnabled", label: "Activity Watcher", info: "Monitors on-chain activity automatically." },
    { key: "stakingEnabled", label: "Staking", info: "Earn yield via Marinade liquid staking." },
    { key: "telegramEnabled", label: "Telegram Notifications", info: "Get notified before trigger and on key events." },
  ];

  return (
    <GlassCard delay={320}>
      <div className="card-title mb-3 text-left">Features</div>
      {rows.map((r, i) => (
        <div key={r.key}>
          {i > 0 && <Divider />}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text)]">{r.label}</span>
            <div className="group relative flex items-center gap-2">
              <Info className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text)] opacity-0 transition-opacity group-hover:opacity-100 z-10 max-w-[220px] text-wrap">
                {r.info}
              </span>
              <Toggle
                checked={vault[r.key] as boolean}
                onChange={(v) => {
                  setToggle(r.key, v);
                  if (r.key === "telegramEnabled" && v) setTgOpen(true);
                }}
                disabled={busy === r.key}
              />
            </div>
          </div>
          {r.key === "telegramEnabled" && vault.telegramEnabled && (
            <div className="anim-fade-up mt-3 flex justify-end">
              <button
                onClick={() => setTgOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
                style={{ color: "var(--accent)" }}
              >
                <Pencil className="h-3 w-3" />
                {chatId ? `Chat ID: ${chatId}` : "Set chat ID"}
              </button>
            </div>
          )}
        </div>
      ))}
      <Dialog open={tgOpen} onOpenChange={setTgOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text)] sm:max-w-sm rounded-[var(--r)]">
          <DialogHeader>
            <DialogTitle className="card-title">Telegram chat ID</DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              Enter your Telegram chat ID to receive alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <TextInput autoFocus placeholder="e.g. 123456789" value={chatId} onChange={(e) => setChatId(e.target.value)} />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <PillButton fullWidth variant="secondary" onClick={() => setTgOpen(false)}>Cancel</PillButton>
              <PillButton fullWidth disabled={!chatId} loading={busy === "telegram"} onClick={async () => { if (chatId) { await connectTelegram(chatId); setTgOpen(false); } }}>
                Connect
              </PillButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
