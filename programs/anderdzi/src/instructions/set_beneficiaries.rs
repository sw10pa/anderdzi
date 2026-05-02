use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, state::{Beneficiary, Vault}};

#[derive(Accounts)]
pub struct SetBeneficiaries<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AnderdziError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<SetBeneficiaries>, beneficiaries: Vec<Beneficiary>) -> Result<()> {
    require!(!beneficiaries.is_empty(), AnderdziError::NoBeneficiaries);
    require!(
        beneficiaries.len() <= Vault::MAX_BENEFICIARIES,
        AnderdziError::TooManyBeneficiaries
    );

    let total_bps: u32 = beneficiaries.iter().map(|b| b.share_bps as u32).sum();
    require!(total_bps == 10_000, AnderdziError::InvalidShares);

    for i in 0..beneficiaries.len() {
        for j in (i + 1)..beneficiaries.len() {
            require!(
                beneficiaries[i].wallet != beneficiaries[j].wallet,
                AnderdziError::DuplicateBeneficiary
            );
        }
    }

    ctx.accounts.vault.beneficiaries = beneficiaries;

    Ok(())
}
