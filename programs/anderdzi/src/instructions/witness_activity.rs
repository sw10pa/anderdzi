use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

#[derive(Accounts)]
pub struct WitnessActivity<'info> {
    // Safety: Account<'info, Vault> verifies the discriminator and deserializes
    // the account before Anchor evaluates the seeds constraint, so vault.owner
    // is a trusted on-chain value, not caller-supplied. Never relax this to
    // AccountInfo or UncheckedAccount without re-evaluating PDA derivation.
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
        has_one = watcher @ AnderdziError::UnauthorizedWatcher,
    )]
    pub vault: Account<'info, Vault>,
    pub watcher: Signer<'info>,
}

pub fn handler(ctx: Context<WitnessActivity>) -> Result<()> {
    ctx.accounts.vault.touch()
}
