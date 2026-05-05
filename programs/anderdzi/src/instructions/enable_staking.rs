use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{errors::AnderdziError, marinade, state::Vault};

#[derive(Accounts)]
pub struct EnableStaking<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,

    /// The vault's mSOL ATA — created if it doesn't exist yet.
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = msol_mint,
        associated_token::authority = vault,
    )]
    pub vault_msol_ata: Account<'info, TokenAccount>,

    #[account(address = marinade::MSOL_MINT)]
    pub msol_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    // remaining_accounts: Marinade deposit accounts (11 accounts) — only needed when vault has SOL to stake
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, EnableStaking<'info>>) -> Result<()> {
    require!(
        !ctx.accounts.vault.staking_enabled,
        AnderdziError::StakingAlreadyEnabled
    );

    let vault_key = ctx.accounts.vault.key();
    let vault = &mut ctx.accounts.vault;
    vault.staking_enabled = true;

    let amount_to_stake = vault.total_deposited;
    if amount_to_stake == 0 {
        vault.touch()?;
        return Ok(());
    }

    // Stake all current SOL via Marinade
    let marinade_accounts =
        marinade::MarinadeDepositAccounts::parse(ctx.remaining_accounts, &vault_key)?;

    let owner_key = ctx.accounts.owner.key();
    let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[vault.bump]];

    marinade::deposit_via_remaining(
        &marinade_accounts,
        &vault.to_account_info(),
        amount_to_stake,
        vault_seeds,
    )?;

    vault.touch()?;
    Ok(())
}
