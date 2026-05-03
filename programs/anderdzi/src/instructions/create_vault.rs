use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{errors::AnderdziError, state::Vault};

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
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateVault>,
    watcher: Pubkey,
    inactivity_period: i64,
    grace_period: i64,
    deposit_amount: u64,
) -> Result<()> {
    require!(
        inactivity_period >= Vault::MIN_INACTIVITY_PERIOD,
        AnderdziError::InactivityPeriodTooShort
    );
    require!(
        grace_period >= Vault::MIN_GRACE_PERIOD,
        AnderdziError::GracePeriodTooShort
    );
    require!(
        watcher != ctx.accounts.owner.key(),
        AnderdziError::WatcherCannotBeOwner
    );
    require!(
        watcher != Pubkey::default(),
        AnderdziError::InvalidWatcher
    );

    let vault = &mut ctx.accounts.vault;

    vault.owner = ctx.accounts.owner.key();
    vault.watcher = watcher;
    vault.inactivity_period = inactivity_period;
    vault.grace_period = grace_period;
    vault.triggered_at = None;
    vault.beneficiaries = Vec::new();
    vault.total_deposited = 0;
    vault.bump = ctx.bumps.vault;
    vault.touch()?;

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
