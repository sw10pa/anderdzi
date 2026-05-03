// Anchor 0.32.x macros check for `anchor-debug`, `custom-heap`, and `custom-panic`
// cfg flags that are internal to those crates. Newer rustc versions surface these
// as unexpected_cfgs warnings in the consuming crate — suppress them here.
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("6xgUzv1pYovTNK1QYAEK5xRdHeTwaum6rGX6AEJqhA1x");

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::Beneficiary;

#[program]
pub mod anderdzi {
    use super::*;

    pub fn create_vault(
        ctx: Context<CreateVault>,
        watcher: Pubkey,
        inactivity_period: i64,
        grace_period: i64,
        deposit_amount: u64,
    ) -> Result<()> {
        instructions::create_vault::handler(ctx, watcher, inactivity_period, grace_period, deposit_amount)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        instructions::ping::handler(ctx)
    }

    pub fn witness_activity(ctx: Context<WitnessActivity>) -> Result<()> {
        instructions::witness_activity::handler(ctx)
    }

    pub fn update_watcher(ctx: Context<UpdateWatcher>, new_watcher: Pubkey) -> Result<()> {
        instructions::update_watcher::handler(ctx, new_watcher)
    }

    pub fn set_beneficiaries(
        ctx: Context<SetBeneficiaries>,
        beneficiaries: Vec<Beneficiary>,
    ) -> Result<()> {
        instructions::set_beneficiaries::handler(ctx, beneficiaries)
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        instructions::close_vault::handler(ctx)
    }
}
