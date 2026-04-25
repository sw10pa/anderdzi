use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod anderdzi {
    use super::*;

    /// Create a new inheritance vault
    pub fn create_vault(
        ctx: Context<CreateVault>,
        inactivity_period: i64,
    ) -> Result<()> {
        instructions::create_vault::handler(ctx, inactivity_period)
    }

    /// Add or update beneficiaries with percentage splits
    pub fn set_beneficiaries(
        ctx: Context<SetBeneficiaries>,
        beneficiaries: Vec<BeneficiaryInput>,
    ) -> Result<()> {
        instructions::set_beneficiaries::handler(ctx, beneficiaries)
    }

    /// Owner check-in — resets the inactivity timer
    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        instructions::ping::handler(ctx)
    }

    /// Bot oracle witnesses on-chain activity — auto-resets the timer
    pub fn witness_activity(ctx: Context<WitnessActivity>) -> Result<()> {
        instructions::witness_activity::handler(ctx)
    }

    /// Trigger the vault after inactivity period has passed
    pub fn trigger(ctx: Context<Trigger>) -> Result<()> {
        instructions::trigger::handler(ctx)
    }

    /// Cancel the trigger during grace period
    pub fn cancel_trigger(ctx: Context<CancelTrigger>) -> Result<()> {
        instructions::cancel_trigger::handler(ctx)
    }

    /// Distribute assets to beneficiaries after grace period
    pub fn distribute(ctx: Context<Distribute>) -> Result<()> {
        instructions::distribute::handler(ctx)
    }

    /// Owner closes the vault and withdraws all assets
    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        instructions::close_vault::handler(ctx)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeneficiaryInput {
    pub commitment: [u8; 32], // SHA-256 hash of beneficiary wallet address
    pub share_bps: u16,       // basis points out of 10000 (e.g. 5000 = 50%)
}
