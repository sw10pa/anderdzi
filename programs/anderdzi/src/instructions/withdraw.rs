use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, marinade, state::Vault};

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
    // remaining_accounts: Marinade unstake accounts (9) when staking is enabled
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, Withdraw<'info>>, amount: u64) -> Result<()> {
    require!(amount > 0, AnderdziError::ZeroAmount);
    require!(
        amount <= ctx.accounts.vault.total_deposited,
        AnderdziError::InsufficientFunds
    );

    let mut user_yield_sol: u64 = 0;

    if ctx.accounts.vault.staking_enabled {
        let marinade_accounts = marinade::MarinadeUnstakeAccounts::parse(
            ctx.remaining_accounts,
            &ctx.accounts.vault.key(),
        )?;

        let owner_key = ctx.accounts.owner.key();
        let vault_bump = ctx.accounts.vault.bump;
        let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[vault_bump]];

        // Harvest protocol's yield share before unstaking (mandatory)
        require!(
            ctx.remaining_accounts.len() >= 10,
            AnderdziError::InvalidMarinadeAccounts
        );
        user_yield_sol = marinade::auto_harvest_yield(
            marinade_accounts.vault_msol_ata,
            &ctx.remaining_accounts[9],
            marinade_accounts.marinade_state,
            marinade_accounts.token_program,
            &ctx.accounts.vault.to_account_info(),
            ctx.accounts.vault.total_deposited,
            vault_seeds,
        )?;

        // Re-read mSOL balance after harvest
        let msol_ata_info = marinade_accounts.vault_msol_ata;
        let msol_ata_data = msol_ata_info.try_borrow_data()?;
        let msol_balance = u64::from_le_bytes(msol_ata_data[64..72].try_into().unwrap());
        drop(msol_ata_data);

        // Adjust total_deposited with user's yield share for proportional calculation
        let adjusted_deposited = ctx
            .accounts
            .vault
            .total_deposited
            .checked_add(user_yield_sol)
            .ok_or(AnderdziError::InsufficientFunds)?;

        // Proportional mSOL to unstake; full balance if withdrawing everything
        let msol_to_unstake = if amount >= adjusted_deposited {
            msol_balance
        } else {
            ((amount as u128 * msol_balance as u128) / adjusted_deposited as u128) as u64
        };
        require!(msol_to_unstake > 0, AnderdziError::ZeroAmount);

        marinade::unstake_via_remaining(
            &marinade_accounts,
            &ctx.accounts.vault.to_account_info(),
            &ctx.accounts.owner.to_account_info(),
            msol_to_unstake,
            vault_seeds,
        )?;
    } else {
        // Direct SOL transfer from vault PDA
        **ctx
            .accounts
            .vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .owner
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;
    }

    let vault = &mut ctx.accounts.vault;
    // Add user's yield share, then subtract withdrawal amount
    vault.total_deposited = vault
        .total_deposited
        .checked_add(user_yield_sol)
        .ok_or(AnderdziError::InsufficientFunds)?;
    vault.total_deposited = vault
        .total_deposited
        .checked_sub(amount)
        .ok_or(AnderdziError::InsufficientFunds)?;
    vault.touch()?;

    Ok(())
}
