# Anderdzi — Implementation Milestones

Deadline: **May 10, 2026**

Each milestone builds on the previous one. Every milestone ends with a working, testable state.

---

## Milestone 1 — Vault Core ✅

_Goal: create and close a vault, deposit and withdraw SOL_

- [x] `create_vault` instruction — initializes vault PDA with owner, watcher, inactivity period, grace period; optional initial deposit; enforces 6-month minimum inactivity period and 7-day minimum grace period
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
- [x] `witness_activity` instruction — trusted watcher resets timer on behalf of owner; also cancels any active trigger
- [x] Watcher keypair stored in vault, only watcher can call `witness_activity`
- [x] `update_watcher` instruction — owner can rotate the watcher keypair at any time
- [x] Watcher cannot be set to the owner pubkey or the zero pubkey (enforced on create and update)
- [x] `touch()` helper on `Vault` — single definition for heartbeat reset + trigger cancel
- [x] Unit tests — 10 tests covering all heartbeat paths, watcher validation, and key rotation

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

## Milestone 6 — Marinade Yield

_Goal: deposited SOL earns yield via Marinade Finance_

- [ ] Auto-stake SOL on deposit via Marinade
- [ ] Track mSOL balance in vault
- [ ] Unstake on distribution — heirs receive SOL + yield
- [ ] Integration tests with Marinade on devnet

---

## Milestone 7 — Bot

_Goal: working Telegram bot with activity watching and notifications_

- [ ] Load all active vaults from on-chain program accounts
- [ ] Poll `getSignaturesForAddress` for each vault owner
- [ ] Auto-submit `witness_activity` when on-chain activity detected
- [ ] Send Telegram notification 30 days before threshold
- [ ] Send Telegram notification when vault triggers (grace period starts)
- [ ] Send final Telegram notification 24h before distribution
- [ ] Deep link in notifications pointing back to dApp

---

## Milestone 8 — Frontend

_Goal: functional web dApp for all vault operations_

- [ ] Wallet connection (Phantom, Solflare)
- [ ] Create vault flow (inactivity period, initial deposit)
- [ ] Beneficiary management UI (add, edit, remove, percentage sliders)
- [ ] Vault dashboard (status, last heartbeat, time remaining, yield accrued)
- [ ] Manual check-in (heartbeat) button
- [ ] Claim interface for beneficiaries
- [ ] Cancel vault / withdraw

---

## Milestone 9 — Deploy & Polish

_Goal: live on devnet, demo-ready_

- [ ] Deploy program to devnet
- [ ] Update program ID in `Anchor.toml`
- [ ] Frontend connected to devnet
- [ ] Bot running against devnet
- [ ] End-to-end demo flow tested
- [ ] Demo video recorded
- [ ] Colosseum submission finalized
