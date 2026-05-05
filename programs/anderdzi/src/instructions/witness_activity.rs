use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

#[derive(Accounts)]
pub struct WitnessActivity<'info> {
    // Safety: Account<'info, Vault> verifies the discriminator and deserializes
    // the account before Anchor evaluates the seeds constraint, so vault.owner
    // is a trusted on-chain value, not caller-supplied.
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,
    pub watcher: Signer<'info>,
}

pub fn handler(ctx: Context<WitnessActivity>) -> Result<()> {
    let vault = &ctx.accounts.vault;
    let watcher_key = ctx.accounts.watcher.key();

    match vault.watcher {
        Some(expected) => require!(watcher_key == expected, AnderdziError::UnauthorizedWatcher),
        None => return Err(AnderdziError::WatcherNotSet.into()),
    }

    ctx.accounts.vault.touch()
}
