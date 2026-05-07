# Anderdzi — Solana Inheritance Vault UI

A Phantom-inspired, mobile-first dApp UI for a Solana "dead man's switch" vault. This plan builds the full visual product with a mock data layer so every screen and state is previewable without a wallet. On-chain integration files are scaffolded as stubs ready for later wiring.

## Design system

- Poppins from Google Fonts, applied globally.
- Custom color tokens in `src/styles.css` (CSS vars + Tailwind v4 `@theme inline`):
  - bg `#0F3932`, surface `#1F453C`, surface-2 `#2A5548`, text `#F1F1F1`, text-muted `#8BA89F`, accent `#4AFF91`, accent-dim `rgba(74,255,145,0.12)`, danger `#FF6B6B`, border `rgba(241,241,241,0.08)`.
- Glassmorphism card utility: blurred translucent surface, subtle inner highlight, rounded-2xl, soft drop shadow, hover lift.
- Pill primary / secondary / danger buttons, 40px circular icon buttons with accent glow on hover.
- Custom slider (accent track + glowing thumb), pill toggle, status badges with pulsing dot.
- Animations: page fade+rise, staggered card mount, count-up numbers, accordion height, slide-in toasts, accent spinner.
- Lucide React for all icons.

## Layout shell

- Max width 520px centered, 16px gutters, mobile-first.
- Top navbar (in `__root.tsx`): "Anderdzi" wordmark in accent + wallet connect / address pill on right.
- Sonner `<Toaster />` mounted bottom-right with custom themed styles.

## Routes (TanStack Start)

```text
src/routes/
  __root.tsx          shell, navbar, toaster, page transitions
  index.tsx           router: landing | create | dashboard based on mock state
  create.tsx          create vault flow
  dashboard.tsx       vault dashboard
```

Routing logic on `/`:
- No wallet → Landing
- Wallet + no vault → redirect to `/create`
- Wallet + vault → redirect to `/dashboard`

## Page 1 — Landing

Centered viewport: shield icon (64px, accent), "Anderdzi" 5xl bold, tagline muted, large primary "Connect Wallet" pill with wallet icon, accordion "How it works ↓" with 4 bullets (Deposit → Stay active → Trigger after inactivity → Beneficiaries claim).

## Page 2 — Dashboard

Stacked glass cards (16px gap):

1. **Vault Status Card** — truncated address + status badge (ACTIVE / TRIGGERED / DISTRIBUTED); large countdown ("TIME UNTIL TRIGGER" + days in 4xl + accent progress bar); TRIGGERED swaps to "GRACE PERIOD REMAINING" in danger; "Last seen X days ago" + info icon.
2. **Balance Card** — two stat columns DEPOSITED / YIELD (yield "—" if staking off); divider; deposit input + primary button row, withdraw input + secondary button row.
3. **Quick Actions** — pill container of icon buttons: I'm Alive (heart, always), Cancel Trigger (x-circle, danger, only TRIGGERED), Close Vault (archive, only when staking off). Tooltips on hover.
4. **Beneficiaries Card** — list rows (avatar initial + truncated address + % badge); inline edit mode (no modal): editable rows, remove icon, "Add Beneficiary" row, live "X / 100%" sum, Save / Cancel buttons.
5. **Settings Card** — three toggle rows with dividers: Activity Watcher, Marinade Staking, Telegram Alerts (when ON, slide-down chat ID input + Connect button).

## Page 3 — Create Vault

Single glass card form: header "Create Your Vault" + subtitle, then:
1. Inactivity Period — custom slider 6–60 months, value badge.
2. Grace Period — custom slider 7–180 days, value badge.
3. Initial Deposit — SOL-suffixed input, optional.
4. Marinade Staking toggle.
5. Beneficiaries — repeatable rows (max 10), "Add another" ghost button, live sum badge (accent at 100, danger otherwise).
6. Full-width "Create Vault" pill, disabled unless sum = 100%.

On submit: 1200ms fake confirm → success toast → navigate to `/dashboard` with `mockVaultActive`.

## Mock data layer

`src/lib/mock.ts`:
- `MOCK_ENABLED = true`
- `mockVaultActive`, `mockVaultTriggered`, `mockVaultNoStaking` (all states)
- `mockWalletAddress = "7xKp...3mNq"`, `mockSolBalance = 4.2819`, `mockYield = 0.0312`

`src/store/useMockStore.ts` (zustand): holds current vault state, wallet connected flag, beneficiaries, toggles, deposit/yield. Actions: connect/disconnect, setVaultState, imAlive (resets countdown), saveBeneficiaries, setToggle, deposit/withdraw, createVault, closeVault, cancelTrigger, connectTelegram. Each mutating action runs through `fakeTx()` helper (1200ms delay + success toast).

**Dev state switcher:** fixed bottom-left pill "Mock: ACTIVE ▾" with dropdown to swap between ACTIVE / TRIGGERED / NO_STAKING / NO_VAULT / DISCONNECTED. Hidden when `MOCK_ENABLED = false`.

## On-chain stubs (ready for real wiring)

- `src/lib/instructions.ts` — one async fn per instruction (createVault, deposit, withdraw, imAlive, cancelTrigger, updateBeneficiaries, setStaking, setWatcher, closeVault, claim), each `Promise<string>` with `// TODO` body returning a fake sig when `MOCK_ENABLED`.
- `src/lib/accounts.ts` — `fetchVault(connection, ownerPubkey)` typed return `Vault | null`, mock branch returns store state.
- `src/hooks/useAnchorProgram.ts` — stubbed Program init, returns `null` for now.
- `src/idl/anderdzi.json` — placeholder empty IDL file (user adds real one later).
- Program ID constant `6xgUzv1pYovTNK1QYAEK5xRdHeTwaum6rGX6AEJqhA1x` exported from `src/lib/constants.ts`.
- `VITE_BOT_API_URL` read via `import.meta.env`.

Wallet adapter packages (`@solana/wallet-adapter-*`, `@solana/web3.js`, `@coral-xyz/anchor`, `zustand`, `sonner`) installed but adapter UI is bypassed while `MOCK_ENABLED=true` (Connect button just flips the mock flag). Real `WalletProvider` wiring is included but no-op until mocks are disabled.

## Error & loading states

- Buttons swap to spinner + "Confirming..." while `fakeTx` runs, disabled.
- Sonner success ("Transaction confirmed ✓") and error toasts, themed accent/danger.
- Disconnect animates back to Landing.
- Account-not-found empty state with shield icon and "Create your vault" CTA.

## Technical notes

- Tailwind v4 tokens defined in `src/styles.css` via `@theme inline` mapping CSS vars; no `tailwind.config.js`.
- Poppins loaded via `<link>` tags in `__root.tsx` head and `font-family` set on body.
- Glass card, pill button, slider, toggle, badge implemented as small reusable components in `src/components/ui-anderdzi/`.
- Page transitions via Framer Motion (already light) or pure CSS keyframes — using CSS to avoid extra deps.
- All "real data" reads go through a single `useVault()` hook that branches on `MOCK_ENABLED`, so flipping the flag later swaps to real chain calls without touching components.

## Out of scope (this iteration)

- Real Anchor program calls, real wallet signing, real Marinade staking, real Telegram bot calls — all stubbed behind mocks per spec.
