use anchor_lang::prelude::*;

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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Beneficiary {
    pub wallet: Pubkey,  // heir's wallet address
    pub share_bps: u16,  // out of 10000
}

impl Beneficiary {
    pub const SIZE: usize = 32 + 2;
}
