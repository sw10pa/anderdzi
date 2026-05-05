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

    // If staking is enabled, unstake all mSOL so funds are ready for distribution
    if vault.staking_enabled {
        let marinade_accounts =
            marinade::MarinadeUnstakeAccounts::parse(ctx.remaining_accounts, &vault.key())?;

        // Read mSOL balance from the ATA (address validated by parse)
        let msol_ata_info = marinade_accounts.vault_msol_ata;
        let msol_ata_data = msol_ata_info.try_borrow_data()?;
        let msol_balance = u64::from_le_bytes(msol_ata_data[64..72].try_into().unwrap());
        drop(msol_ata_data);

        if msol_balance > 0 {
            let owner_key = vault.owner;
            let vault_bump = vault.bump;
            let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[vault_bump]];

            // Unstake to the vault PDA itself (not an external destination)
            marinade::unstake_via_remaining(
                &marinade_accounts,
                &vault.to_account_info(),
                &vault.to_account_info(),
                msol_balance,
                vault_seeds,
            )?;

            // Update total_deposited to include yield (actual SOL received may exceed principal)
            let vault_balance_after = vault.to_account_info().lamports();
            let rent = Rent::get()?.minimum_balance(vault.to_account_info().data_len());
            vault.total_deposited = vault_balance_after.saturating_sub(rent);
        }

        vault.staking_enabled = false;
    }

    vault.triggered_at = Some(now);
    Ok(())
}
