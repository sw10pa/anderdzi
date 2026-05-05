use anchor_lang::prelude::*;

use crate::{
    errors::AnderdziError,
    state::{Treasury, Vault},
};

#[derive(Accounts)]
#[instruction(vault_owner: Pubkey)]
pub struct AdminRotateWatcher<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault_owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        seeds = [b"treasury"],
        bump = treasury.bump,
        has_one = authority @ AnderdziError::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<AdminRotateWatcher>,
    _vault_owner: Pubkey,
    new_watcher: Option<Pubkey>,
) -> Result<()> {
    Vault::validate_watcher(new_watcher, &ctx.accounts.vault.owner)?;
    ctx.accounts.vault.watcher = new_watcher;
    Ok(())
}
