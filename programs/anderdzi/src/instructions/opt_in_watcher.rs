use anchor_lang::prelude::*;

use crate::{
    errors::AnderdziError,
    state::{Treasury, Vault},
};

#[derive(Accounts)]
pub struct OptInWatcher<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
    #[account(
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,
}

pub fn handler(ctx: Context<OptInWatcher>) -> Result<()> {
    require!(
        ctx.accounts.treasury.default_watcher.is_some(),
        AnderdziError::NoDefaultWatcher
    );
    ctx.accounts.vault.watcher_enabled = true;
    Ok(())
}
