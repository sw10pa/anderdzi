use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Vault};

#[derive(Accounts)]
pub struct Trigger<'info> {
    // Safety: same pattern as witness_activity — vault.owner is a trusted on-chain
    // value, so seeds derivation cannot be spoofed by the (permissionless) caller.
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,
}

pub fn handler(ctx: Context<Trigger>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let now = Clock::get()?.unix_timestamp;

    require!(
        now >= vault.last_heartbeat + vault.inactivity_period,
        AnderdziError::NotInactive
    );
    require!(vault.triggered_at.is_none(), AnderdziError::AlreadyTriggered);

    vault.triggered_at = Some(now);
    Ok(())
}
