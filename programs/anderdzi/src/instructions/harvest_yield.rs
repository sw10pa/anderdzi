use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer as SplTransfer};

use crate::{
    errors::AnderdziError,
    marinade::{self, MSOL_MINT},
    state::{Treasury, Vault},
};

/// Permissionless instruction that transfers protocol's 50% of accrued yield
/// (in mSOL) from the vault's mSOL ATA to the protocol treasury's mSOL ATA.
#[derive(Accounts)]
pub struct HarvestYield<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        token::authority = vault,
        token::mint = MSOL_MINT,
    )]
    pub vault_msol_ata: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,

    /// Protocol treasury's mSOL ATA. Validated: must be owned by the treasury PDA.
    #[account(
        mut,
        token::mint = MSOL_MINT,
        token::authority = treasury,
    )]
    pub treasury_msol_ata: Account<'info, TokenAccount>,

    /// CHECK: Validated by address constraint
    #[account(address = marinade::MARINADE_STATE)]
    pub marinade_state: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<HarvestYield>) -> Result<()> {
    require!(
        ctx.accounts.vault.staking_enabled,
        AnderdziError::StakingNotEnabled
    );

    let marinade_data = ctx.accounts.marinade_state.try_borrow_data()?;
    let (msol_price, price_denominator) = marinade::parse_msol_price(&marinade_data)?;
    drop(marinade_data);

    let msol_balance = ctx.accounts.vault_msol_ata.amount;
    let total_deposited = ctx.accounts.vault.total_deposited;

    // mSOL equivalent of the principal
    let principal_msol = marinade::sol_to_msol(total_deposited, msol_price, price_denominator);

    let yield_msol = msol_balance.saturating_sub(principal_msol);
    require!(yield_msol > 0, AnderdziError::NoYieldAvailable);

    let protocol_share_msol = yield_msol / 2;
    require!(protocol_share_msol > 0, AnderdziError::NoYieldAvailable);

    let user_share_msol = yield_msol - protocol_share_msol;

    let owner_key = ctx.accounts.vault.owner;
    let vault_bump = ctx.accounts.vault.bump;
    let seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[vault_bump]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SplTransfer {
                from: ctx.accounts.vault_msol_ata.to_account_info(),
                to: ctx.accounts.treasury_msol_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[seeds],
        ),
        protocol_share_msol,
    )?;

    // Update total_deposited to include user's yield share (prevents double-harvest)
    let user_share_sol = marinade::msol_to_sol(user_share_msol, msol_price, price_denominator);
    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = vault
        .total_deposited
        .checked_add(user_share_sol)
        .ok_or(AnderdziError::InsufficientFunds)?;

    Ok(())
}
