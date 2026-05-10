use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

// Marinade CPI (stake existing balance on enable) is disabled until mainnet launch.
// Full implementation lives in marinade.rs and is already active in deposit.rs.
// To re-enable: add vault_msol_ata (init_if_needed), msol_mint (address = MSOL_MINT),
// token_program, associated_token_program to the accounts struct, and call
// marinade::deposit_via_remaining for vault.total_deposited > 0.

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
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EnableStaking>) -> Result<()> {
    require!(
        !ctx.accounts.vault.staking_enabled,
        AnderdziError::StakingAlreadyEnabled
    );

    let vault = &mut ctx.accounts.vault;
    vault.staking_enabled = true;
    vault.touch()?;
    Ok(())
}
