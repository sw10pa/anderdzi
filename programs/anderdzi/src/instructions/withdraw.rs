use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(amount > 0, AnderdziError::ZeroAmount);
    require!(
        amount <= ctx.accounts.vault.total_deposited,
        AnderdziError::InsufficientFunds
    );

    // Transfer SOL out of the PDA via direct lamport manipulation.
    // PDAs cannot sign for system_program::transfer, so this is the correct approach.
    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += amount;

    ctx.accounts.vault.total_deposited -= amount;

    Ok(())
}
