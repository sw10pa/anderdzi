use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Treasury};

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = authority,
        space = Treasury::space(),
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeTreasury>, default_watcher: Option<Pubkey>) -> Result<()> {
    if let Some(w) = default_watcher {
        require!(w != Pubkey::default(), AnderdziError::InvalidWatcher);
    }
    let treasury = &mut ctx.accounts.treasury;
    treasury.authority = ctx.accounts.authority.key();
    treasury.default_watcher = default_watcher;
    treasury.bump = ctx.bumps.treasury;
    Ok(())
}
