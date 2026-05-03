use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

#[derive(Accounts)]
pub struct UpdateWatcher<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateWatcher>, new_watcher: Pubkey) -> Result<()> {
    require!(
        new_watcher != Pubkey::default(),
        AnderdziError::InvalidWatcher
    );
    require!(
        new_watcher != ctx.accounts.owner.key(),
        AnderdziError::WatcherCannotBeOwner
    );
    ctx.accounts.vault.watcher = new_watcher;
    Ok(())
}
