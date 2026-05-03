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

    pub fn initialize_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        instructions::initialize_treasury::handler(ctx)
    }

    pub fn create_vault(
        ctx: Context<CreateVault>,
        watcher: Pubkey,
        inactivity_period: i64,
        grace_period: i64,
        deposit_amount: u64,
        beneficiaries: Vec<Beneficiary>,
    ) -> Result<()> {
        instructions::create_vault::handler(
            ctx,
            watcher,
            inactivity_period,
            grace_period,
            deposit_amount,
            beneficiaries,
        )
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

    pub fn update_beneficiaries(
        ctx: Context<UpdateBeneficiaries>,
        beneficiaries: Vec<Beneficiary>,
    ) -> Result<()> {
        instructions::update_beneficiaries::handler(ctx, beneficiaries)
    }

    pub fn trigger(ctx: Context<Trigger>) -> Result<()> {
        instructions::trigger::handler(ctx)
    }

    pub fn cancel_trigger(ctx: Context<CancelTrigger>) -> Result<()> {
        instructions::cancel_trigger::handler(ctx)
    }

    pub fn distribute(ctx: Context<Distribute>) -> Result<()> {
        instructions::distribute::handler(ctx)
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        instructions::withdraw_fees::handler(ctx)
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        instructions::close_vault::handler(ctx)
    }
}
