use anchor_lang::prelude::*;

use crate::{
    errors::AnderdziError,
    state::{Treasury, Vault},
};

#[derive(Accounts)]
pub struct WitnessActivity<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,
    pub watcher: Signer<'info>,
}

pub fn handler(ctx: Context<WitnessActivity>) -> Result<()> {
    let vault = &ctx.accounts.vault;

    require!(vault.watcher_enabled, AnderdziError::WatcherNotEnabled);

    let expected_watcher = ctx
        .accounts
        .treasury
        .default_watcher
        .ok_or_else(|| error!(AnderdziError::NoDefaultWatcher))?;

    require!(
        ctx.accounts.watcher.key() == expected_watcher,
        AnderdziError::UnauthorizedWatcher
    );

    ctx.accounts.vault.touch()
}
