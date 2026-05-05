use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{errors::AnderdziError, marinade, state::Vault};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    // remaining_accounts: Marinade deposit accounts (11) when staking is enabled
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, Deposit<'info>>, amount: u64) -> Result<()> {
    require!(amount > 0, AnderdziError::ZeroAmount);

    // Transfer SOL from owner to vault PDA
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    let vault_key = ctx.accounts.vault.key();
    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = vault
        .total_deposited
        .checked_add(amount)
        .ok_or(AnderdziError::InsufficientFunds)?;

    // Auto-stake if staking is enabled
    if vault.staking_enabled {
        let marinade_accounts =
            marinade::MarinadeDepositAccounts::parse(ctx.remaining_accounts, &vault_key)?;

        let owner_key = ctx.accounts.owner.key();
        let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[vault.bump]];

        marinade::deposit_via_remaining(
            &marinade_accounts,
            &vault.to_account_info(),
            amount,
            vault_seeds,
        )?;
    }

    vault.touch()?;
    Ok(())
}
