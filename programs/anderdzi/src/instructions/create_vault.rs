use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{
    errors::AnderdziError,
    state::{Beneficiary, Treasury, Vault},
};

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = owner,
        space = Vault::space(Vault::MAX_BENEFICIARIES),
        seeds = [b"vault", owner.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateVault>,
    enable_watcher: bool,
    inactivity_period: i64,
    grace_period: i64,
    deposit_amount: u64,
    staking_enabled: bool,
    beneficiaries: Vec<Beneficiary>,
) -> Result<()> {
    require!(
        inactivity_period >= Vault::MIN_INACTIVITY_PERIOD,
        AnderdziError::InactivityPeriodTooShort
    );
    require!(
        grace_period >= Vault::MIN_GRACE_PERIOD,
        AnderdziError::GracePeriodTooShort
    );

    // If user wants watcher, treasury must have a default configured
    if enable_watcher {
        require!(
            ctx.accounts.treasury.default_watcher.is_some(),
            AnderdziError::NoDefaultWatcher
        );
    }

    let vault = &mut ctx.accounts.vault;

    vault.owner = ctx.accounts.owner.key();
    vault.watcher_enabled = enable_watcher;
    vault.inactivity_period = inactivity_period;
    vault.grace_period = grace_period;
    vault.total_deposited = 0;
    vault.staking_enabled = staking_enabled;
    vault.bump = ctx.bumps.vault;
    vault.touch()?;
    vault.set_beneficiaries(beneficiaries)?;

    if deposit_amount > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: vault.to_account_info(),
                },
            ),
            deposit_amount,
        )?;
        vault.total_deposited = deposit_amount;
    }

    Ok(())
}
