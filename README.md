# Anderdzi — On-Chain Crypto Inheritance Protocol

> *Anderdzi (ანდერძი) is the Georgian word for testament — a final declaration of your wishes, meant to outlast you. We built this because self-custody shouldn't end when you do.*

---

## What is Anderdzi?

Anderdzi is a self-custody inheritance protocol on Solana. Deposit SOL and SPL tokens into a secure vault, designate beneficiaries with percentage splits, and set an inactivity period. If you stop using crypto and miss your reminders, the vault automatically distributes your assets to your heirs.

Your beneficiaries remain hidden on-chain until the moment of distribution. Your assets earn yield while they wait. As long as you're using Solana normally, Anderdzi stays completely silent.

---

## How It Works

1. **Create a vault** — deposit SOL and SPL tokens, set your inactivity period
2. **Add beneficiaries** — wallet addresses stored as hashed commitments, invisible until distribution
3. **Assets earn yield** — SOL is auto-staked via Marinade Finance
4. **Anderdzi watches quietly** — monitors your on-chain activity, resets the timer automatically
5. **If you go dark** — Telegram notifications with a direct check-in link
6. **If the trigger fires** — grace period, final alert, then proportional distribution

---

## Repository Structure

```
anderdzi/
├── programs/anderdzi/     # Anchor smart contract (Rust)
│   └── src/
│       ├── lib.rs         # Program entrypoint
│       ├── state.rs       # Account structures
│       ├── errors.rs      # Custom error codes
│       └── instructions/  # One file per instruction
├── bot/                   # Activity watcher + Telegram bot (Rust)
│   └── src/
│       ├── main.rs
│       ├── watcher.rs     # On-chain activity monitoring
│       └── notifier.rs    # Telegram notifications
├── app/                   # React frontend (TypeScript)
├── tests/                 # Anchor integration tests
├── Anchor.toml
└── Cargo.toml
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Anchor 0.32, Rust |
| Activity watcher + Telegram bot | Rust, teloxide, solana-client |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Wallet connection | Solana Wallet Adapter |
| Yield | Marinade Finance |

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
yarn install
```

### Build the program

```bash
anchor build
```

### Run tests

```bash
anchor test
```

### Run the bot

```bash
cp bot/.env.example bot/.env
# fill in TELEGRAM_BOT_TOKEN and SOLANA_RPC_URL
cargo run --bin anderdzi-bot
```

---

## Team

**Stepane Gurgenidze** — Software Engineer
**Luka Karzhalovi** — Software Engineer

Built for the [Colosseum](https://arena.colosseum.org) hackathon.
