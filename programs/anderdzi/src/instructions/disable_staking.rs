use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{errors::AnderdziError, marinade, state::Vault};

#[derive(Accounts)]
pub struct DisableStaking<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        token::authority = vault,
        token::mint = marinade::MSOL_MINT,
    )]
    pub vault_msol_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    // remaining_accounts: Marinade unstake accounts (9 accounts)
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, DisableStaking<'info>>) -> Result<()> {
    require!(
        ctx.accounts.vault.staking_enabled,
        AnderdziError::StakingAlreadyDisabled
    );

    let owner_key = ctx.accounts.owner.key();
    let vault_bump = ctx.accounts.vault.bump;
    let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[vault_bump]];

    let msol_balance = ctx.accounts.vault_msol_ata.amount;

    if msol_balance > 0 {
        let marinade_accounts = marinade::MarinadeUnstakeAccounts::parse(
            ctx.remaining_accounts,
            &ctx.accounts.vault.key(),
        )?;

        // Harvest protocol's yield share before unstaking (mandatory)
        require!(
            ctx.remaining_accounts.len() >= 10,
            AnderdziError::InvalidMarinadeAccounts
        );
        marinade::auto_harvest_yield(
            marinade_accounts.vault_msol_ata,
            &ctx.remaining_accounts[9],
            marinade_accounts.marinade_state,
            marinade_accounts.token_program,
            &ctx.accounts.vault.to_account_info(),
            ctx.accounts.vault.total_deposited,
            vault_seeds,
        )?;

        // Reload mSOL balance after harvest (CPI may have changed it)
        ctx.accounts.vault_msol_ata.reload()?;
        let msol_balance = ctx.accounts.vault_msol_ata.amount;

        if msol_balance > 0 {
            // Unstake back to vault PDA (not owner) to keep funds in the vault
            marinade::unstake_via_remaining(
                &marinade_accounts,
                &ctx.accounts.vault.to_account_info(),
                &ctx.accounts.vault.to_account_info(),
                msol_balance,
                vault_seeds,
            )?;
        }
    }

    // Read balance before mutable borrow
    let vault_info = ctx.accounts.vault.to_account_info();
    let rent = Rent::get()?.minimum_balance(vault_info.data_len());
    let actual_balance = vault_info.lamports().saturating_sub(rent);

    let vault = &mut ctx.accounts.vault;
    vault.staking_enabled = false;
    // Recompute total_deposited from actual vault balance (captures yield, accounts for fees)
    vault.total_deposited = actual_balance;
    vault.touch()?;
    Ok(())
}
