import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useMockStore } from "@/store/useMockStore";
import { GlassCard, PillButton, Slider, TextInput, Toggle, Divider } from "@/components/anderdzi/Primitives";
import type { Beneficiary } from "@/lib/mock";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create Vault — Anderdzi" },
      { name: "description", content: "Set up your Solana inheritance vault." },
    ],
  }),
  component: CreatePage,
});

const MONTH = 30;
const YEAR = 365;

function CreatePage() {
  const navigate = useNavigate();
  const { createVault, busy } = useMockStore();
  const [inactivityDays, setInactivityDays] = useState(YEAR);
  const [graceDays, setGraceDays] = useState(7);
  const [deposit, setDeposit] = useState("");
  const [staking, setStaking] = useState(false);
  const [watcher, setWatcher] = useState(false);
  const [telegram, setTelegram] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([{ address: "", percentage: 100 }]);

  const sum = beneficiaries.reduce((s, b) => s + (Number(b.percentage) || 0), 0);
  const valid = sum === 100 && beneficiaries.every((b) => b.address.length > 0) && beneficiaries.length >= 1 && beneficiaries.length <= 10;

  return (
    <div className="pt-2">
      <GlassCard>
        <h1 className="page-title text-left">Create Your Vault</h1>
        <Divider />

        <PeriodSlider
          label="Inactivity Period"
          value={inactivityDays}
          onChange={setInactivityDays}
          min={6 * MONTH}
          max={10 * YEAR}
          step={MONTH}
          presets={[
            { label: "6 months", value: 6 * MONTH },
            { label: "1 year", value: YEAR },
            { label: "2 years", value: 2 * YEAR },
            { label: "5 years", value: 5 * YEAR },
            { label: "10 years", value: 10 * YEAR },
          ]}
          formatValue={formatMonths}
        />
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

        {/* Deposit */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="card-title text-left text-base">Initial Deposit</span>
          </div>
          <div className="relative">
            <TextInput
              type="number"
              placeholder="0.00"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              className="no-spin pr-14"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">SOL</span>
          </div>
        </div>

        {/* Optional features */}
        <div className="mb-6 rounded-[var(--r)] border border-[var(--border)] bg-[rgba(15,57,50,0.4)]">
          <button
            type="button"
            onClick={() => setOptionalOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-[var(--text)]">Optional features</span>
            <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${optionalOpen ? "rotate-180" : ""}`} />
          </button>
          {optionalOpen && (
            <div className="px-4 pb-4">
              <p className="mb-3 text-xs text-[var(--text-muted)]">Disabled by default — you can enable any of these later from your vault.</p>
              {[
                { label: "Staking", checked: staking, onChange: setStaking },
                { label: "Activity Watcher", checked: watcher, onChange: setWatcher },
                { label: "Telegram Notifications", checked: telegram, onChange: setTelegram },
              ].map((row, i) => (
                <div key={row.label}>
                  {i > 0 && <Divider />}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text)]">{row.label}</span>
                    <Toggle checked={row.checked} onChange={row.onChange} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Beneficiaries */}
        <div className="mb-4 flex items-center justify-between">
          <span className="card-title text-left">Beneficiaries</span>
          <PercentBadge sum={sum} />
        </div>

        <div className="space-y-2">
          {beneficiaries.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <TextInput placeholder="Beneficiary address" value={b.address} onChange={(e) => setBeneficiaries((d) => d.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
              <div className="relative">
                <input
                  type="number"
                  value={b.percentage === 0 ? "" : b.percentage}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, "");
                    const n = raw === "" ? 0 : Number(raw);
                    setBeneficiaries((d) => d.map((x, j) => j === i ? { ...x, percentage: n } : x));
                  }}
                  className="input-base no-spin w-16 pr-5 text-center text-sm"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">%</span>
              </div>
              <button onClick={() => setBeneficiaries((d) => d.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--danger)]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {beneficiaries.length < 10 && (
            <button
              onClick={() =>
                setBeneficiaries((d) => {
                  const remaining = Math.max(0, 100 - d.reduce((s, b) => s + (Number(b.percentage) || 0), 0));
                  return [...d, { address: "", percentage: remaining }];
                })
              }
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              <Plus className="h-3 w-3" /> Add another
            </button>
          )}
        </div>

        <div className="mt-6">
          <PillButton
            fullWidth
            disabled={!valid}
            loading={busy === "create"}
            onClick={async () => {
              await createVault({
                inactivityDays,
                graceDays,
                deposit: Number(deposit) || 0,
                staking,
                watcher,
                telegram,
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
  const months = Math.round(days / MONTH);
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return months === 1 ? "1 month" : `${months} months`;
}

type Preset = { label: string; value: number };

function PeriodSlider({ label, value, onChange, min, max, step = 1, presets, formatValue }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; presets: Preset[]; formatValue: (d: number) => string }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="card-title text-left text-base">{label}</span>
        <span className="text-base font-semibold text-[var(--accent)]" style={{ fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.02em" }}>
          {formatValue(value)}
        </span>
      </div>
      <Slider value={value} onChange={(v) => onChange(Math.min(max, Math.max(min, v)))} min={min} max={max} step={step} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className="rounded-[var(--r)] px-2.5 py-0.5 text-[11px] font-medium transition-colors"
              style={{
                background: active ? "var(--accent-dim)" : "rgba(241,241,241,0.04)",
                color: active ? "var(--accent)" : "var(--text-muted)",
                border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
              }}
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
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        background: ok ? "var(--accent-dim)" : over ? "rgba(255,107,107,0.12)" : "rgba(241,241,241,0.06)",
        color: ok ? "var(--accent)" : over ? "var(--danger)" : "var(--text-muted)",
      }}
    >
      {sum}%
    </span>
  );
}