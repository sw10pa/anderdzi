use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{Token, TokenAccount};

use crate::{errors::AnderdziError, marinade, state::Vault};

#[derive(Accounts)]
pub struct StakeDeposit<'info> {
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

    /// CHECK: Validated against MARINADE_PROGRAM_ID
    #[account(address = marinade::MARINADE_PROGRAM_ID)]
    pub marinade_program: UncheckedAccount<'info>,
    /// CHECK: Validated against MARINADE_STATE
    #[account(mut, address = marinade::MARINADE_STATE)]
    pub marinade_state: UncheckedAccount<'info>,
    /// CHECK: Validated against MSOL_MINT
    #[account(mut, address = marinade::MSOL_MINT)]
    pub msol_mint: UncheckedAccount<'info>,
    /// CHECK: Marinade liq pool SOL leg PDA (validated by Marinade CPI)
    #[account(mut)]
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    /// CHECK: Marinade liq pool mSOL leg (validated by Marinade CPI)
    #[account(mut)]
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
    /// CHECK: Marinade liq pool mSOL leg authority PDA (validated by Marinade CPI)
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,
    /// CHECK: Marinade reserve PDA (validated by Marinade CPI)
    #[account(mut)]
    pub reserve_pda: UncheckedAccount<'info>,
    /// CHECK: Marinade mSOL mint authority PDA (validated by Marinade CPI)
    pub msol_mint_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<StakeDeposit>, amount: u64) -> Result<()> {
    require!(amount > 0, AnderdziError::ZeroAmount);
    require!(
        ctx.accounts.vault.staking_enabled,
        AnderdziError::StakingNotEnabled
    );

    // Transfer SOL from owner to vault PDA (vault needs lamports for Marinade CPI)
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

    // CPI: Marinade deposit (vault PDA signs as transfer_from)
    let owner_key = ctx.accounts.owner.key();
    let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[ctx.accounts.vault.bump]];

    let marinade_accounts: [AccountInfo; 11] = [
        ctx.accounts.marinade_state.to_account_info(),
        ctx.accounts.msol_mint.to_account_info(),
        ctx.accounts.liq_pool_sol_leg_pda.to_account_info(),
        ctx.accounts.liq_pool_msol_leg.to_account_info(),
        ctx.accounts.liq_pool_msol_leg_authority.to_account_info(),
        ctx.accounts.reserve_pda.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.vault_msol_ata.to_account_info(),
        ctx.accounts.msol_mint_authority.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    ];

    marinade::cpi_deposit(
        &ctx.accounts.marinade_program.to_account_info(),
        &marinade_accounts,
        amount,
        vault_seeds,
    )?;

    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = vault
        .total_deposited
        .checked_add(amount)
        .ok_or(AnderdziError::InsufficientFunds)?;
    vault.touch()?;

    Ok(())
}
