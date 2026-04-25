# Anderdzi — Implementation Milestones

Deadline: **May 10, 2026**

Each milestone builds on the previous one. Every milestone ends with a working, testable state.

---

## Milestone 1 — Vault Core
*Goal: create and close a vault, deposit and withdraw SOL*

- [ ] `create_vault` instruction — initializes vault account with owner, watcher, inactivity period
- [ ] `close_vault` instruction — owner withdraws all SOL and closes the account
- [ ] Unit tests for create and close
- [ ] Vault account structure (`state.rs`) finalized

---

## Milestone 2 — Beneficiaries
*Goal: owner can set, update, and remove beneficiaries with percentage splits*

- [ ] `set_beneficiaries` instruction — stores hashed commitments + share basis points
- [ ] Validation: shares must sum to 10000 bps (100%)
- [ ] Validation: max 10 beneficiaries
- [ ] Unit tests for beneficiary management

---

## Milestone 3 — Heartbeat & Activity
*Goal: inactivity timer works via both manual ping and bot oracle*

- [ ] `ping` instruction — owner resets timer manually
- [ ] `witness_activity` instruction — trusted watcher resets timer on behalf of owner
- [ ] Watcher keypair stored in vault, only watcher can call `witness_activity`
- [ ] Unit tests for both heartbeat paths

---

## Milestone 4 — Trigger & Grace Period
*Goal: vault can be triggered after inactivity and cancelled during grace period*

- [ ] `trigger` instruction — callable by anyone after inactivity period elapses
- [ ] `cancel_trigger` instruction — owner cancels during grace period
- [ ] Grace period: 7 days after trigger before distribution is allowed
- [ ] Unit tests for trigger flow

---

## Milestone 5 — Distribution
*Goal: assets distribute proportionally to beneficiaries after grace period*

- [ ] `distribute` instruction — callable by anyone after grace period
- [ ] Beneficiary reveals their wallet address to claim (commitment verified on-chain)
- [ ] SOL split by share basis points
- [ ] SPL token support
- [ ] Unit tests for full distribution flow
- [ ] End-to-end test: create → deposit → trigger → distribute

---

## Milestone 6 — Marinade Yield
*Goal: deposited SOL earns yield via Marinade Finance*

- [ ] Auto-stake SOL on deposit via Marinade
- [ ] Track mSOL balance in vault
- [ ] Unstake on distribution — heirs receive SOL + yield
- [ ] Integration tests with Marinade on devnet

---

## Milestone 7 — Bot
*Goal: working Telegram bot with activity watching and notifications*

- [ ] Load all active vaults from on-chain program accounts
- [ ] Poll `getSignaturesForAddress` for each vault owner
- [ ] Auto-submit `witness_activity` when on-chain activity detected
- [ ] Send Telegram notification 30 days before threshold
- [ ] Send Telegram notification when vault triggers (grace period starts)
- [ ] Send final Telegram notification 24h before distribution
- [ ] Deep link in notifications pointing back to dApp

---

## Milestone 8 — Frontend
*Goal: functional web dApp for all vault operations*

- [ ] Wallet connection (Phantom, Solflare)
- [ ] Create vault flow (inactivity period, initial deposit)
- [ ] Beneficiary management UI (add, edit, remove, percentage sliders)
- [ ] Vault dashboard (status, last heartbeat, time remaining, yield accrued)
- [ ] Manual check-in (heartbeat) button
- [ ] Claim interface for beneficiaries
- [ ] Cancel vault / withdraw

---

## Milestone 9 — Deploy & Polish
*Goal: live on devnet, demo-ready*

- [ ] Deploy program to devnet
- [ ] Update program ID in `Anchor.toml`
- [ ] Frontend connected to devnet
- [ ] Bot running against devnet
- [ ] End-to-end demo flow tested
- [ ] Demo video recorded
- [ ] Colosseum submission finalized
