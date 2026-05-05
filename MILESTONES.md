# Anderdzi — Implementation Milestones

Deadline: **May 10, 2026**

Each milestone builds on the previous one. Every milestone ends with a working, testable state.

---

## Milestone 1 — Vault Core ✅

_Goal: create and close a vault, deposit and withdraw SOL_

- [x] `create_vault` instruction — initializes vault PDA with owner, `enable_watcher: bool`, inactivity period, grace period; optional initial deposit; enforces 6-month minimum inactivity period and 7-day minimum grace period
- [x] `close_vault` instruction — owner withdraws all SOL (rent + deposits) and closes the account atomically
- [x] `deposit` instruction — owner deposits additional SOL into an existing vault at any time
- [x] `withdraw` instruction — owner withdraws a partial amount of SOL without closing the vault
- [x] Vault account structure (`state.rs`) finalized — `MIN_INACTIVITY_PERIOD`, `MIN_GRACE_PERIOD`, `MAX_BENEFICIARIES` constants defined
- [x] Unit tests — 14 tests covering happy paths and all error conditions for every instruction

---

## Milestone 2 — Beneficiaries ✅

_Goal: owner can set and update beneficiaries with percentage splits_

- [x] `update_beneficiaries` instruction — stores beneficiary wallet addresses + share basis points; replaces entire list on each call
- [x] Validation: shares must sum to 10000 bps (100%)
- [x] Validation: max 10 beneficiaries
- [x] Validation: list cannot be empty
- [x] Unit tests for beneficiary management — 7 tests covering all cases
- [x] Simplified to plain wallet addresses (no hashing) — distribution will be automatic in Milestone 5

---

## Milestone 3 — Heartbeat & Activity ✅

_Goal: inactivity timer works via both manual ping and bot oracle_

- [x] `ping` instruction — owner resets timer manually; also cancels any active trigger
- [x] `witness_activity` instruction — trusted watcher (resolved from Treasury.default_watcher) resets timer on behalf of owner; also cancels any active trigger
- [x] Watcher resolved at runtime from Treasury PDA — no per-vault pubkey storage
- [x] `opt_in_watcher` / `opt_out_watcher` instructions — owner controls whether their vault participates in automated watching
- [x] Watcher cannot be set to the zero pubkey (enforced via `set_default_watcher`)
- [x] `touch()` helper on `Vault` — single definition for heartbeat reset + trigger cancel
- [x] Unit tests — 10 tests covering all heartbeat paths, watcher opt-in/opt-out, and default watcher management

---

## Milestone 4 — Trigger & Grace Period ✅

_Goal: vault can be triggered after inactivity and cancelled by the owner_

- [x] `trigger` instruction — permissionless; fires after inactivity period elapses; sets `triggered_at`
- [x] `cancel_trigger` instruction — owner-only; callable at any time while vault is triggered; calls `touch()` to reset the inactivity timer and clear `triggered_at`
- [x] Refactor: `create_vault` now requires beneficiaries at creation — a vault can never exist without heirs
- [x] Beneficiary validation extracted to `Vault::set_beneficiaries()` — shared by `create_vault` and `update_beneficiaries`
- [x] Unit tests — 3 tests covering error paths; happy path (trigger fires, cancel clears it) requires clock manipulation and is tracked for LiteSVM integration

---

## Milestone 5 — Distribution ✅

_Goal: assets distribute proportionally to beneficiaries after grace period_

- [x] `initialize_treasury` instruction — one-time setup; creates a protocol treasury PDA seeded by `[b"treasury"]`; the signer becomes the fee authority
- [x] `distribute` instruction — permissionless; callable after grace period elapses (`triggered_at + grace_period ≤ now`); splits `total_deposited` proportionally to beneficiaries; 1% protocol fee + rounding dust go to treasury; vault auto-closes and rent is also sent to treasury
- [x] `withdraw_fees` instruction — authority-only; drains accumulated fees from the treasury PDA to a destination wallet
- [x] SOL split by share basis points; beneficiary wallets passed as `remaining_accounts` and validated against stored list
- [x] Unit tests — 5 tests covering treasury init, NotTriggered guard, non-authority withdraw rejection, zero-balance withdrawal rejection
- [x] End-to-end test (`tests/e2e.ts`) — 8 tests covering full lifecycle with clock manipulation via LiteSVM: treasury init → vault creation → NotInactive guard → trigger → AlreadyTriggered guard → GracePeriodActive guard → proportional distribution with exact lamport assertions → fee withdrawal
- [ ] SPL token support — deferred to a later milestone

---

## Milestone 6 — Marinade Yield ✅

_Goal: deposited SOL earns yield via Marinade Finance_

- [x] Marinade CPI adapter (`marinade.rs`) — manual `invoke_signed` (no external crate dependency); exchange rate math with u128 overflow protection
- [x] `MarinadeDepositAccounts` / `MarinadeUnstakeAccounts` helpers — parse and validate Marinade accounts from `remaining_accounts`; derive and verify canonical vault mSOL ATA on-chain in every call (prevents mSOL redirection attacks)
- [x] `harvest_yield` instruction — permissionless; transfers 50% of accrued yield (mSOL) to protocol treasury; updates `total_deposited` as high-water mark to prevent double-charging
- [x] **Auto-harvest** — `trigger`, `withdraw`, and `disable_staking` automatically harvest protocol's 50% yield share before unstaking; treasury mSOL ATA required as `remaining_accounts[9]` on `withdraw` and `disable_staking` (mandatory fee collection); `trigger` skips gracefully if ATA not provided (safety-critical path must not be blocked)
- [x] `stake_deposit` / `unstake_withdraw` instructions — kept as manual recovery paths
- [x] Vault `staking_enabled` flag — opt-in per vault at creation or via `enable_staking`
- [x] **Transparent staking** — all fund operations auto-stake/unstake as needed:
  - [x] `create_vault` supports `staking_enabled=true` — creates mSOL ATA (idempotent) and stakes initial deposit via `remaining_accounts`
  - [x] `enable_staking` instruction — owner enables staking on existing vault; creates mSOL ATA via `init_if_needed`; stakes all current SOL
  - [x] `disable_staking` instruction — owner disables staking; unstakes all mSOL back to vault PDA; recomputes `total_deposited` from actual balance
  - [x] `deposit` auto-stakes deposited SOL when `staking_enabled` via `remaining_accounts`
  - [x] `withdraw` auto-unstakes proportional mSOL when `staking_enabled` via `remaining_accounts`
  - [x] `trigger` auto-unstakes all mSOL, updates `total_deposited` to include yield, sets `staking_enabled = false`
  - [x] `distribute` requires `staking_enabled = false` (trigger handles unstaking)
  - [x] `close_vault` requires `staking_enabled = false` (owner must call `disable_staking` first)
- [x] Address constraints on all Marinade accounts (program, state, mSOL mint, vault ATA)
- [x] Treasury mSOL ATA bound to treasury PDA authority (prevents spoofing)
- [x] Marinade state price sanity check (1–10 SOL/mSOL range)
- [x] Bot executor handles staking vaults — passes Marinade `remaining_accounts` when triggering staked vaults
- [x] Unit tests — 8 Rust tests for yield math, overflow, edge cases
- [x] Integration tests (`tests/staking.ts`) — 8 tests covering vault creation flags, staking guards, off-chain yield math
- [ ] Full CPI integration test with mainnet-forked localnet (requires Marinade program deployed; deferred)
---

## Milestone 7 — Bot ✅

_Goal: optional activity watcher bot with optional Telegram notifications_

- [x] Watcher changed to `watcher_enabled: bool` — opt-in per vault; effective watcher resolved from `Treasury.default_watcher` at call time
- [x] `set_default_watcher` instruction — treasury authority sets/rotates the protocol watcher pubkey; instantly applies to all opted-in vaults
- [x] Protocol-managed watcher — only treasury authority can set the bot key via `set_default_watcher`; instantly rotates for all opted-in vaults
- [x] Activity watcher bot (`bot/src/watcher.rs`) — loads assigned vaults via `getProgramAccounts` with memcmp filter; polls `getSignaturesForAddress` on each owner; verifies owner was actually a signer (prevents dust-attack spoofing); submits `witness_activity` when new activity detected; hourly poll loop; skips triggered vaults
- [x] Automatic executor (`bot/src/executor.rs`) — permissionless; fetches all program vaults each cycle; submits `trigger` when inactivity period elapses (only after confirming no recent owner activity); submits `distribute` when grace period elapses; gracefully handles races (another party already triggered/distributed)
- [x] Bot restructured into separate modules: `common.rs` (shared types), `executor.rs` (trigger/distribute), `watcher.rs` (activity witnessing), `notifier.rs` (Telegram), `main.rs` (orchestrator)
- [x] Telegram notification system (optional) — users opt-in via HTTP API (`POST /register`) with ed25519 wallet signature proving vault ownership; bot sends DMs at threshold intervals (30d, 7d, 1d before trigger; on trigger; 1d before distribution; on distribution)
- [x] PDA ownership verification — API verifies vault pubkey matches owner’s PDA derivation without RPC calls
- [x] Notification deduplication — SQLite tracks sent notifications per vault/subscriber/type; cleared on heartbeat reset; fail-closed on DB errors (skips sending rather than spamming)
- [x] Bounded notification ranges — only one pre-trigger notification type applies at a time (30d/7d/1d are exclusive windows, not cumulative)
- [x] Privacy trade-off documented — if bot is compromised, attacker sees Telegram-to-vault mapping for opted-in users only
- [x] Automatic data cleanup — subscription and notification data purged when vaults are distributed or closed (prevents historical data leaks)
- [x] Unit tests (`tests/watcher.ts`) — 15 tests covering ping, witness_activity (enabled/disabled vault, wrong watcher, owner-as-watcher), opt-in/opt-out, set_default_watcher (update, non-authority, clear to null, opt_in without default)
- [ ] Multisig for treasury authority — prevents single-key compromise from rotating the default watcher (deferred)
- [ ] Rate-limit or timelock on admin watcher rotations (deferred)
- [ ] Dedicated RPC/indexer — public RPCs may disable `getProgramAccounts` (deferred)

---

## Milestone 8 — Frontend

_Goal: functional web dApp covering all vault operations_

- [ ] **Wallet & scaffold** — Solana Wallet Adapter (supports all major wallets); React + Vite + Tailwind; Anchor client generation (`anchor build` IDL)
- [ ] **Create vault** — form for inactivity period, grace period, initial deposit (optional), staking toggle, beneficiary list with percentage sliders (must sum to 100%)
- [ ] **Vault dashboard** — owner's vault status (active / triggered / distributed), last heartbeat timestamp, countdown to trigger, total deposited, estimated yield (mSOL value − principal)
- [ ] **Deposit & withdraw** — deposit additional SOL; withdraw partial amount; both auto-stake/unstake when staking enabled
- [ ] **Staking controls** — enable/disable staking toggle; show current mSOL balance and estimated yield
- [ ] **Beneficiary management** — edit beneficiary list (add/remove wallets, adjust percentages); call `update_beneficiaries`
- [ ] **Watcher opt-in/out** — toggle watcher participation; show current watcher status
- [ ] **I'm alive** — button to reset inactivity timer (sends `ping`)
- [ ] **Cancel trigger** — button to cancel an active trigger (owner only, during grace period)
- [ ] **Close vault** — close vault and reclaim all SOL (requires staking disabled, no active trigger)
- [ ] **Notifications opt-in** — Telegram registration flow (sign message → POST to bot API)
- [ ] **Error handling** — user-friendly error messages mapped from on-chain error codes; transaction confirmation toasts

---

## Milestone 9 — Deploy & Polish

_Goal: live on devnet, demo-ready, Colosseum submission_

- [ ] Deploy program to devnet; update program ID across `Anchor.toml`, IDL, and frontend config
- [ ] Initialize treasury on devnet (set authority, default watcher)
- [ ] Create treasury mSOL ATA on devnet (required for yield harvest)
- [ ] Deploy frontend to a public URL (Vercel / Cloudflare Pages)
- [ ] Bot deployed and running against devnet (executor + watcher + notifier)
- [ ] Configure bot environment — `PROGRAM_ID`, RPC/WS URLs, treasury keypair, Telegram token, CORS for frontend ↔ bot API
- [ ] Fund executor/watcher service wallets with devnet SOL
- [ ] Frontend connected to devnet with correct program ID and RPC
- [ ] End-to-end devnet test: create vault → deposit → enable staking → wait → trigger → distribute → verify beneficiary balances
- [ ] Bot smoke test: watcher detects activity, executor triggers/distributes, notifier sends Telegram DM
- [ ] Marinade integration verified on devnet (deposit stakes, withdraw unstakes, yield accrues)
- [ ] Demo video recorded (full lifecycle walkthrough)
- [ ] Colosseum submission finalized (README, video, deployed links)
