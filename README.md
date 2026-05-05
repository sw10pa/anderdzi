# Anderdzi — On-Chain Crypto Inheritance Protocol

> _Anderdzi (ანდერძი) is the Georgian word for testament — a final declaration of your wishes, meant to outlast you. We built this because self-custody shouldn't end when you do._

---

## What is Anderdzi?

Anderdzi is a self-custody inheritance protocol on Solana. Deposit SOL and SPL tokens into a secure vault, designate beneficiaries with percentage splits, and set an inactivity period. If you stop using crypto and miss your reminders, the vault automatically distributes your assets to your heirs.

Your assets earn yield while they wait. As long as you're using Solana normally, Anderdzi stays completely silent.

---

## How It Works

1. **Create a vault** — set your inactivity period, designate beneficiaries with percentage splits, and optionally make an initial deposit
2. **Update anytime** — adjust beneficiaries, deposit or withdraw SOL, opt in/out of the watcher
3. **Assets earn yield** — SOL is auto-staked via Marinade Finance
4. **Anderdzi watches quietly** — monitors your on-chain activity, resets the timer automatically
5. **If you go dark** — Telegram notifications with a direct check-in link
6. **If the trigger fires** — grace period, final alert, then automatic proportional distribution

---

## Repository Structure

```
anderdzi/
├── programs/anderdzi/     # Anchor smart contract (Rust)
│   └── src/
│       ├── lib.rs         # Program entrypoint
│       ├── state.rs       # Account structures
│       ├── errors.rs      # Custom error codes
│       ├── marinade.rs    # Marinade Finance CPI adapter
│       └── instructions/  # One file per instruction
├── bot/                   # Off-chain bot: executor, watcher, notifier (Rust)
│   └── src/
│       ├── main.rs        # Orchestrator and poll loop
│       ├── common.rs      # Shared types and helpers
│       ├── executor.rs    # Automatic trigger & distribution
│       ├── watcher.rs     # On-chain activity monitoring
│       ├── notifier.rs    # Telegram notification sender
│       ├── api.rs         # HTTP API for registration
│       └── db.rs          # SQLite storage
├── app/                   # React frontend (TypeScript)
├── Anchor.toml
└── Cargo.toml
```

---

## Tech Stack

| Layer                | Technology                            |
| -------------------- | ------------------------------------- |
| Smart contract       | Anchor 0.32, Rust                     |
| Bot (executor/watcher/notifier) | Rust, solana-client, axum, rusqlite   |
| Frontend             | React, TypeScript, Vite, Tailwind CSS |
| Wallet connection    | Solana Wallet Adapter                 |
| Yield                | Marinade Finance                      |

---

## Getting Started

### Prerequisites

- Rust 1.75+
- Anchor CLI 0.32.1
- Solana CLI 1.18+
- Node.js 18+ and Yarn

### Setup

```bash
git clone https://github.com/sw10pa/anderdzi
cd anderdzi
yarn install       # Anchor test dependencies
cd app && npm install  # Frontend dependencies
```

### Build the program

```bash
anchor build
```

### Run tests

```bash
anchor build
cargo test                                          # Rust unit tests
anchor test                                         # Integration tests (LiteSVM)
```

### Run the bot

```bash
cp bot/.env.example bot/.env
# fill in SOLANA_RPC_URL, WATCHER_KEYPAIR_PATH, PROGRAM_ID
# optionally set TELEGRAM_BOT_TOKEN for notifications
cargo run --bin anderdzi-bot
```

### Run the frontend

```bash
cd app && npm run dev
```

---

## Team

**Stepane Gurgenidze** — Software Engineer
**Luka Karzhalovi** — Software Engineer

Built for the [Colosseum](https://arena.colosseum.org) hackathon.
