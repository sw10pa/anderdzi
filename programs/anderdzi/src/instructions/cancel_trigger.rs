use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

#[derive(Accounts)]
pub struct CancelTrigger<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<CancelTrigger>) -> Result<()> {
    require!(
        ctx.accounts.vault.triggered_at.is_some(),
        AnderdziError::NotTriggered
    );
    ctx.accounts.vault.touch()
}
