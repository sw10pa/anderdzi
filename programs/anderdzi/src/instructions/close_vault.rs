use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
        constraint = !vault.staking_enabled @ AnderdziError::UseUnstakeWithdraw,
        close = owner,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

pub fn handler(_ctx: Context<CloseVault>) -> Result<()> {
    Ok(())
}
