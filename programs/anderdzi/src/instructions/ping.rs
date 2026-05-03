use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

#[derive(Accounts)]
pub struct Ping<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<Ping>) -> Result<()> {
    ctx.accounts.vault.touch()
}
