use anchor_lang::prelude::*;

use crate::errors::AnderdziError;

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub watcher: Pubkey,          // trusted bot oracle pubkey
    pub inactivity_period: i64,   // seconds before vault triggers
    pub last_heartbeat: i64,      // unix timestamp of last activity
    pub grace_period: i64,        // seconds after trigger before distribution
    pub triggered_at: Option<i64>,
    pub beneficiaries: Vec<Beneficiary>,
    pub total_deposited: u64,
    pub bump: u8,
}

impl Vault {
    pub const MAX_BENEFICIARIES: usize = 10;
    pub const MIN_INACTIVITY_PERIOD: i64 = 15_552_000; // 6 months in seconds
    pub const MIN_GRACE_PERIOD: i64 = 604_800; // 7 days in seconds

    pub fn touch(&mut self) -> Result<()> {
        self.last_heartbeat = Clock::get()?.unix_timestamp;
        self.triggered_at = None;
        Ok(())
    }

    pub fn set_beneficiaries(&mut self, beneficiaries: Vec<Beneficiary>) -> Result<()> {
        require!(!beneficiaries.is_empty(), AnderdziError::NoBeneficiaries);
        require!(
            beneficiaries.len() <= Self::MAX_BENEFICIARIES,
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

        self.beneficiaries = beneficiaries;
        Ok(())
    }

    pub fn space(beneficiary_count: usize) -> usize {
        8           // discriminator
        + 32        // owner
        + 32        // watcher
        + 8         // inactivity_period
        + 8         // last_heartbeat
        + 8         // grace_period
        + 9         // triggered_at (Option<i64>)
        + 4 + (beneficiary_count * Beneficiary::SIZE) // beneficiaries vec
        + 8         // total_deposited
        + 1         // bump
    }
}

#[account]
pub struct Treasury {
    pub authority: Pubkey,
    pub bump: u8,
}

impl Treasury {
    pub fn space() -> usize {
        8   // discriminator
        + 32 // authority
        + 1  // bump
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Beneficiary {
    pub wallet: Pubkey,  // heir's wallet address
    pub share_bps: u16,  // out of 10000
}

impl Beneficiary {
    pub const SIZE: usize = 32 + 2;
}
