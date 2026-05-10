import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, Info } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useVaultStore } from "@/store/useVaultStore";
import { useChain } from "@/hooks/useChain";
import { useSolBalance } from "@/hooks/useSolBalance";
import { GlassCard, PillButton, Slider, TextInput, Toggle } from "@/components/anderdzi/Primitives";
import type { Beneficiary } from "@/lib/mock";

function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/create")({
  component: CreatePage,
});

const MONTH = 30;

function CreatePage() {
  const navigate = useNavigate();
  const { connected, createVault, busy } = useVaultStore();
  const { program, owner, connection } = useChain();
  const walletBalance = useSolBalance();
  const [inactivityDays, setInactivityDays] = useState(24 * MONTH);
  const [graceDays, setGraceDays] = useState(14);
  const [deposit, setDeposit] = useState("");
  const [staking, setStaking] = useState(false);
  const [watcher, setWatcher] = useState(false);
  const [telegram, setTelegram] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { address: "", percentage: 100 },
  ]);

  useEffect(() => {
    document.title = "Anderdzi";
  }, []);

  useEffect(() => {
    if (!connected) navigate({ to: "/" });
  }, [connected, navigate]);

  const sum = beneficiaries.reduce((s, b) => s + (Number(b.percentage) || 0), 0);
  const valid =
    sum === 100 &&
    beneficiaries.length >= 1 &&
    beneficiaries.length <= 10 &&
    beneficiaries.every((b) => isValidPublicKey(b.address));

  return (
    <div className="pt-2">
      <GlassCard>
        <h1 className="page-title text-left">Create Your Vault</h1>

        <div className="mt-6">
          <PeriodSlider
            label="Inactivity Period"
            value={inactivityDays}
            onChange={setInactivityDays}
            min={6 * MONTH}
            max={120 * MONTH}
            step={MONTH}
            presets={[
              { label: "6 months", value: 6 * MONTH },
              { label: "1 year", value: 12 * MONTH },
              { label: "2 years", value: 24 * MONTH },
              { label: "5 years", value: 60 * MONTH },
              { label: "10 years", value: 120 * MONTH },
            ]}
            formatValue={formatMonths}
          />
        </div>

        <PeriodSlider
          label="Grace Period"
          value={graceDays}
          onChange={setGraceDays}
          min={7}
          max={30}
          step={1}
          presets={[
            { label: "7 days", value: 7 },
            { label: "14 days", value: 14 },
            { label: "30 days", value: 30 },
          ]}
          formatValue={(d) => `${d} days`}
        />

        {/* Initial Deposit */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="card-title text-left text-base">Initial Deposit</span>
          </div>
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            Available: {walletBalance.toFixed(2)} SOL
          </p>
          <div className="relative">
            <TextInput
              type="number"
              placeholder="0.00"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              className="no-spin pr-24"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeposit(String(walletBalance))}
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
              >
                MAX
              </button>
              <span className="text-xs font-semibold text-[var(--text-muted)]">SOL</span>
            </div>
          </div>
        </div>

        {/* Beneficiaries */}
        <div className="mb-4 flex items-center justify-between">
          <span className="card-title text-left">Beneficiaries</span>
          <PercentBadge sum={sum} />
        </div>

        <div className="space-y-2">
          {beneficiaries.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <TextInput
                placeholder="Beneficiary address"
                value={b.address}
                onChange={(e) =>
                  setBeneficiaries((d) =>
                    d.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)),
                  )
                }
              />
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={b.percentage === 0 ? "" : b.percentage}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, "");
                    if (raw !== "" && raw.includes(".") && raw.split(".")[1]?.length > 2) return;
                    const n = raw === "" ? 0 : Number(raw);
                    setBeneficiaries((d) =>
                      d.map((x, j) => (j === i ? { ...x, percentage: n } : x)),
                    );
                  }}
                  className="input-base no-spin w-20 pr-5 text-center text-sm"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                  %
                </span>
              </div>
              {beneficiaries.length > 1 && (
                <button
                  onClick={() => setBeneficiaries((d) => d.filter((_, j) => j !== i))}
                  className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {beneficiaries.length < 10 && (
            <button
              onClick={() =>
                setBeneficiaries((d) => {
                  const remaining = Math.max(
                    0,
                    100 - d.reduce((s, b) => s + (Number(b.percentage) || 0), 0),
                  );
                  return [...d, { address: "", percentage: remaining }];
                })
              }
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              <Plus className="h-3 w-3" /> Add another
            </button>
          )}
        </div>

        {/* Optional Features — available from vault dashboard after creation */}

        <div className="mt-6">
          <PillButton
            fullWidth
            disabled={!valid}
            loading={busy === "create"}
            onClick={async () => {
              if (!program || !owner) return;
              await createVault(program, owner, connection, {
                inactivityDays,
                graceDays,
                deposit: Number(deposit) || 0,
                staking,
                watcher,
                beneficiaries,
              });
              navigate({ to: "/dashboard" });
            }}
          >
            Create Vault
          </PillButton>
        </div>
      </GlassCard>
    </div>
  );
}

function formatMonths(days: number): string {
  const totalMonths = Math.round(days / MONTH);
  if (totalMonths <= 11) {
    return totalMonths === 1 ? "1 month" : `${totalMonths} months`;
  }
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const yearStr = years === 1 ? "1 year" : `${years} years`;
  if (months === 0) return yearStr;
  const monthStr = months === 1 ? "1 month" : `${months} months`;
  return `${yearStr} and ${monthStr}`;
}

type Preset = { label: string; value: number };

function PeriodSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  presets,
  formatValue,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  presets: Preset[];
  formatValue: (d: number) => string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="card-title text-left text-base">{label}</span>
        <span
          className="text-base font-semibold text-[var(--accent)]"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
        >
          {formatValue(value)}
        </span>
      </div>
      <Slider
        value={value}
        onChange={(v) => onChange(Math.min(max, Math.max(min, v)))}
        min={min}
        max={max}
        step={step}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={`rounded-[var(--r)] px-2.5 py-0.5 text-[11px] font-medium transition-all duration-300 ${
                active
                  ? "glass-inner-accent text-[var(--accent)]"
                  : "glass-inner text-[var(--text-muted)] hover:border-[rgba(74,255,145,0.25)] hover:text-[var(--text)]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PercentBadge({ sum }: { sum: number }) {
  const ok = sum === 100;
  const over = sum > 100;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm ${
        ok
          ? "glass-inner-accent text-[var(--accent)]"
          : over
            ? "bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.2)] text-[var(--danger)]"
            : "glass-inner text-[var(--text-muted)]"
      }`}
    >
      {sum}%
    </span>
  );
}
