use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Treasury};

#[derive(Accounts)]
pub struct SetDefaultWatcher<'info> {
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
        has_one = authority @ AnderdziError::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<SetDefaultWatcher>, new_watcher: Option<Pubkey>) -> Result<()> {
    if let Some(w) = new_watcher {
        require!(w != Pubkey::default(), AnderdziError::InvalidWatcher);
    }
    ctx.accounts.treasury.default_watcher = new_watcher;
    Ok(())
}
