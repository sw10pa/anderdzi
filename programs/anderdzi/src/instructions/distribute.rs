use anchor_lang::prelude::*;

use crate::{
    errors::AnderdziError,
    state::{Treasury, Vault},
};

#[derive(Accounts)]
pub struct Distribute<'info> {
    // Safety: same pattern as trigger/witness_activity — vault.owner is a
    // trusted on-chain value, so PDA derivation cannot be spoofed by the caller.
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
        close = treasury,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,
    // remaining_accounts: one writable AccountInfo per beneficiary,
    // in the same order as vault.beneficiaries
}

pub fn handler(ctx: Context<Distribute>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    let triggered_at = ctx
        .accounts
        .vault
        .triggered_at
        .ok_or_else(|| error!(AnderdziError::NotTriggered))?;
    let grace_period = ctx.accounts.vault.grace_period;
    let total = ctx.accounts.vault.total_deposited;

    require!(
        now >= triggered_at + grace_period,
        AnderdziError::GracePeriodActive
    );

    require!(
        !ctx.accounts.vault.staking_enabled,
        AnderdziError::StakingMustBeDisabled
    );

    let beneficiaries = ctx.accounts.vault.beneficiaries.clone();

    require!(
        ctx.remaining_accounts.len() == beneficiaries.len(),
        AnderdziError::BeneficiaryAccountMismatch
    );
    for (i, account) in ctx.remaining_accounts.iter().enumerate() {
        require!(
            account.key() == beneficiaries[i].wallet,
            AnderdziError::BeneficiaryAccountMismatch
        );
    }

    // 1% fee, rounded down — dust is added to protocol amount below
    let fee = total / 100;
    let distributable = total - fee;

    let vault_info = ctx.accounts.vault.to_account_info();
    let treasury_info = ctx.accounts.treasury.to_account_info();

    let mut distributed: u64 = 0;
    for (beneficiary, account) in beneficiaries.iter().zip(ctx.remaining_accounts.iter()) {
        // u128 prevents overflow on the intermediate product
        let share = (distributable as u128 * beneficiary.share_bps as u128 / 10_000) as u64;
        **vault_info.try_borrow_mut_lamports()? -= share;
        **account.try_borrow_mut_lamports()? += share;
        distributed += share;
    }

    // fee + all rounding dust → treasury
    let protocol_amount = total - distributed;
    **vault_info.try_borrow_mut_lamports()? -= protocol_amount;
    **treasury_info.try_borrow_mut_lamports()? += protocol_amount;

    // `close = treasury` in the accounts constraint transfers the remaining
    // vault rent-exempt lamports to treasury after this handler returns.

    Ok(())
}
