use anchor_lang::prelude::*;

use crate::{errors::AnderdziError, marinade, state::Vault};

#[derive(Accounts)]
pub struct Trigger<'info> {
    // Permissionless — anyone can trigger if inactivity period elapsed.
    // vault.owner is a trusted on-chain value, so PDA derivation cannot be spoofed.
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,
    // remaining_accounts: Marinade unstake accounts (9) when staking is enabled.
    // The caller (bot or anyone) must pass these if vault has staked funds.
    // The SOL destination for unstake is the vault PDA itself.
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, Trigger<'info>>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let now = Clock::get()?.unix_timestamp;

    require!(
        now >= vault.last_heartbeat + vault.inactivity_period,
        AnderdziError::NotInactive
    );
    require!(
        vault.triggered_at.is_none(),
        AnderdziError::AlreadyTriggered
    );

    // If staking is enabled, harvest yield and unstake all mSOL for distribution
    if vault.staking_enabled {
        let marinade_accounts =
            marinade::MarinadeUnstakeAccounts::parse(ctx.remaining_accounts, &vault.key())?;

        let owner_key = vault.owner;
        let vault_bump = vault.bump;
        let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[vault_bump]];

        // Auto-harvest yield — skip only if treasury_msol_ata not provided.
        // Trigger is permissionless and safety-critical; must not be blocked by
        // missing ATA, but real errors (bad state, transfer failure) propagate.
        if ctx.remaining_accounts.len() >= 10 {
            marinade::auto_harvest_yield(
                marinade_accounts.vault_msol_ata,
                &ctx.remaining_accounts[9],
                marinade_accounts.marinade_state,
                marinade_accounts.token_program,
                &vault.to_account_info(),
                vault.total_deposited,
                vault_seeds,
            )?;
        }

        // Re-read mSOL balance after harvest (balance changed by transfer)
        let msol_ata_info = marinade_accounts.vault_msol_ata;
        let msol_ata_data = msol_ata_info.try_borrow_data()?;
        let msol_balance = u64::from_le_bytes(msol_ata_data[64..72].try_into().unwrap());
        drop(msol_ata_data);

        if msol_balance > 0 {
            marinade::unstake_via_remaining(
                &marinade_accounts,
                &vault.to_account_info(),
                &vault.to_account_info(),
                msol_balance,
                vault_seeds,
            )?;
        }

        // Recompute total_deposited from actual vault balance
        let vault_balance_after = vault.to_account_info().lamports();
        let rent = Rent::get()?.minimum_balance(vault.to_account_info().data_len());
        vault.total_deposited = vault_balance_after.saturating_sub(rent);
        vault.staking_enabled = false;
    }

    vault.triggered_at = Some(now);
    Ok(())
}
