use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{errors::AnderdziError, marinade, state::Vault};

#[derive(Accounts)]
pub struct UnstakeWithdraw<'info> {
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
        token::mint = msol_mint,
    )]
    pub vault_msol_ata: Account<'info, TokenAccount>,

    /// CHECK: Validated by address constraint
    #[account(address = marinade::MARINADE_PROGRAM_ID)]
    pub marinade_program: UncheckedAccount<'info>,
    /// CHECK: Validated by address constraint
    #[account(mut, address = marinade::MARINADE_STATE)]
    pub marinade_state: UncheckedAccount<'info>,
    /// CHECK: Validated by address constraint
    #[account(mut, address = marinade::MSOL_MINT)]
    pub msol_mint: UncheckedAccount<'info>,
    /// CHECK: Marinade liq pool SOL leg PDA (validated by Marinade CPI)
    #[account(mut)]
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    /// CHECK: Marinade liq pool mSOL leg (validated by Marinade CPI)
    #[account(mut)]
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
    /// CHECK: Marinade treasury mSOL account (validated by Marinade CPI)
    #[account(mut)]
    pub marinade_treasury_msol: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UnstakeWithdraw>, sol_amount: u64) -> Result<()> {
    require!(sol_amount > 0, AnderdziError::ZeroAmount);
    require!(
        ctx.accounts.vault.staking_enabled,
        AnderdziError::StakingNotEnabled
    );
    require!(
        sol_amount <= ctx.accounts.vault.total_deposited,
        AnderdziError::InsufficientFunds
    );

    let msol_balance = ctx.accounts.vault_msol_ata.amount;
    let total_deposited = ctx.accounts.vault.total_deposited;

    // Proportional mSOL to unstake; full balance if withdrawing everything
    let msol_to_unstake = if sol_amount == total_deposited {
        msol_balance
    } else {
        ((sol_amount as u128 * msol_balance as u128) / total_deposited as u128) as u64
    };
    require!(msol_to_unstake > 0, AnderdziError::ZeroAmount);

    let owner_key = ctx.accounts.owner.key();
    let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[ctx.accounts.vault.bump]];

    let marinade_accounts: [AccountInfo; 10] = [
        ctx.accounts.marinade_state.to_account_info(),
        ctx.accounts.msol_mint.to_account_info(),
        ctx.accounts.liq_pool_sol_leg_pda.to_account_info(),
        ctx.accounts.liq_pool_msol_leg.to_account_info(),
        ctx.accounts.marinade_treasury_msol.to_account_info(),
        ctx.accounts.vault_msol_ata.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.owner.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    ];

    marinade::cpi_liquid_unstake(
        &ctx.accounts.marinade_program.to_account_info(),
        &marinade_accounts,
        msol_to_unstake,
        vault_seeds,
    )?;

    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = vault
        .total_deposited
        .checked_sub(sol_amount)
        .ok_or(AnderdziError::InsufficientFunds)?;
    vault.touch()?;

    Ok(())
}
