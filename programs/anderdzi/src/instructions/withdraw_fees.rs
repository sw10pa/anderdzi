use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::Treasury};

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
        has_one = authority @ AnderdziError::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,
    pub authority: Signer<'info>,
    /// CHECK: destination wallet chosen by the authority
    #[account(mut)]
    pub destination: AccountInfo<'info>,
}

pub fn handler(ctx: Context<WithdrawFees>) -> Result<()> {
    let rent_minimum = Rent::get()?.minimum_balance(Treasury::space());
    let treasury_info = ctx.accounts.treasury.to_account_info();
    let withdrawable = treasury_info.lamports().saturating_sub(rent_minimum);

    require!(withdrawable > 0, AnderdziError::ZeroAmount);

    **treasury_info.try_borrow_mut_lamports()? -= withdrawable;
    **ctx.accounts.destination.try_borrow_mut_lamports()? += withdrawable;

    Ok(())
}
