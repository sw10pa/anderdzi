// Anchor 0.32.x macros check for `anchor-debug`, `custom-heap`, and `custom-panic`
// cfg flags that are internal to those crates. Newer rustc versions surface these
// as unexpected_cfgs warnings in the consuming crate — suppress them here.
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("6xgUzv1pYovTNK1QYAEK5xRdHeTwaum6rGX6AEJqhA1x");

pub mod errors;
pub mod instructions;
pub mod marinade;
pub mod state;

use instructions::*;
use state::Beneficiary;

#[program]
pub mod anderdzi {
    use super::*;

    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        default_watcher: Option<Pubkey>,
    ) -> Result<()> {
        instructions::initialize_treasury::handler(ctx, default_watcher)
    }

    pub fn set_default_watcher(
        ctx: Context<SetDefaultWatcher>,
        new_watcher: Option<Pubkey>,
    ) -> Result<()> {
        instructions::set_default_watcher::handler(ctx, new_watcher)
    }

    pub fn create_vault<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateVault<'info>>,
        enable_watcher: bool,
        inactivity_period: i64,
        grace_period: i64,
        deposit_amount: u64,
        staking_enabled: bool,
        beneficiaries: Vec<Beneficiary>,
    ) -> Result<()> {
        instructions::create_vault::handler(
            ctx,
            enable_watcher,
            inactivity_period,
            grace_period,
            deposit_amount,
            staking_enabled,
            beneficiaries,
        )
    }

    pub fn deposit<'info>(
        ctx: Context<'_, '_, '_, 'info, Deposit<'info>>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn withdraw<'info>(
        ctx: Context<'_, '_, '_, 'info, Withdraw<'info>>,
        amount: u64,
    ) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        instructions::ping::handler(ctx)
    }

    pub fn witness_activity(ctx: Context<WitnessActivity>) -> Result<()> {
        instructions::witness_activity::handler(ctx)
    }

    pub fn opt_in_watcher(ctx: Context<OptInWatcher>) -> Result<()> {
        instructions::opt_in_watcher::handler(ctx)
    }

    pub fn opt_out_watcher(ctx: Context<OptOutWatcher>) -> Result<()> {
        instructions::opt_out_watcher::handler(ctx)
    }

    pub fn update_beneficiaries(
        ctx: Context<UpdateBeneficiaries>,
        beneficiaries: Vec<Beneficiary>,
    ) -> Result<()> {
        instructions::update_beneficiaries::handler(ctx, beneficiaries)
    }

    pub fn trigger<'info>(ctx: Context<'_, '_, '_, 'info, Trigger<'info>>) -> Result<()> {
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

    pub fn enable_staking<'info>(
        ctx: Context<'_, '_, '_, 'info, EnableStaking<'info>>,
    ) -> Result<()> {
        instructions::enable_staking::handler(ctx)
    }

    pub fn disable_staking<'info>(
        ctx: Context<'_, '_, '_, 'info, DisableStaking<'info>>,
    ) -> Result<()> {
        instructions::disable_staking::handler(ctx)
    }

    pub fn stake_deposit(ctx: Context<StakeDeposit>, amount: u64) -> Result<()> {
        instructions::stake_deposit::handler(ctx, amount)
    }

    pub fn unstake_withdraw(ctx: Context<UnstakeWithdraw>, sol_amount: u64) -> Result<()> {
        instructions::unstake_withdraw::handler(ctx, sol_amount)
    }

    pub fn harvest_yield(ctx: Context<HarvestYield>) -> Result<()> {
        instructions::harvest_yield::handler(ctx)
    }
}
