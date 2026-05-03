use anchor_lang::prelude::*;

use crate::{
    errors::AnderdziError,
    state::{Beneficiary, Vault},
};

#[derive(Accounts)]
pub struct UpdateBeneficiaries<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateBeneficiaries>, beneficiaries: Vec<Beneficiary>) -> Result<()> {
    ctx.accounts.vault.set_beneficiaries(beneficiaries)
}
