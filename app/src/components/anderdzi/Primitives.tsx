import { cn } from "@/lib/utils";
import { Loader2, Check } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function GlassCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("glass-card glass-card-hover p-5 anim-fade-up", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export function PillButton({
  variant = "primary",
  loading,
  icon,
  children,
  className,
  disabled,
  fullWidth,
  ...rest
}: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--r)] px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-[var(--accent)] text-[#0F3932] hover:brightness-110 hover:shadow-[0_0_24px_rgba(74,255,145,0.4)]",
    secondary:
      "glass-card !border !border-[var(--text)] text-[var(--text)] hover:brightness-110 hover:shadow-[0_0_24px_rgba(74,255,145,0.4)]",
    danger:
      "border border-[var(--danger)] text-[var(--danger)] bg-transparent hover:bg-[rgba(255,107,107,0.15)]",
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(base, variants[variant], fullWidth && "w-full", className)}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span>{loading ? "Confirming..." : children}</span>
    </button>
  );
}

export function IconButton({
  children,
  label,
  active,
  danger,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="group relative">
      <button
        {...rest}
        className={cn(
          "h-10 w-10 rounded-full glass-inner flex items-center justify-center transition-all duration-200",
          "hover:shadow-[0_0_20px_rgba(74,255,145,0.15)] hover:bg-[rgba(255,255,255,0.07)] hover:border-[rgba(74,255,145,0.25)]",
          danger && "text-[var(--danger)] hover:shadow-[0_0_20px_rgba(255,107,107,0.4)]",
          active && "text-[var(--accent)]",
          !danger && !active && "text-[var(--text)]",
        )}
      >
        {children}
      </button>
      <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md glass-nav px-2 py-1 text-xs text-[var(--text)] opacity-0 transition-opacity group-hover:opacity-100 z-10">
        {label}
      </div>
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn("input-base", className)} />;
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-all duration-200 disabled:opacity-50",
        checked
          ? "bg-[var(--accent-solid)]"
          : "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200",
          checked && "translate-x-5",
        )}
      >
        {checked && <Check className="h-3 w-3 text-[#1F8A4C]" strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Badge({
  kind,
  children,
}: {
  kind: "ACTIVE" | "TRIGGERED" | "DISTRIBUTED";
  children?: ReactNode;
}) {
  const map = {
    ACTIVE: { bg: "rgba(74,255,145,0.18)", color: "#5BFF9E" },
    TRIGGERED: { bg: "rgba(255,107,107,0.12)", color: "var(--danger)" },
    DISTRIBUTED: { bg: "rgba(241,241,241,0.08)", color: "var(--text-muted)" },
  } as const;
  const s = map[kind];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
      style={{
        background: s.bg,
        color: s.color,
        boxShadow: kind === "ACTIVE" ? "0 0 16px rgba(74,255,145,0.35)" : undefined,
      }}
    >
      <span
        className="anim-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: s.color }}
      />
      {children ?? kind}
    </span>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative">
      <div
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
        style={{ width: `${pct}%` }}
      />
      <input
        type="range"
        className="anderdzi-slider relative"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Divider() {
  return <div className="my-4 h-px w-full bg-[var(--border)]" />;
}
