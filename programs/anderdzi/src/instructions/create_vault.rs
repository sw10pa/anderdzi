use anchor_lang::{
    prelude::*,
    solana_program::program::invoke,
    system_program::{transfer, Transfer},
};

use crate::{
    errors::AnderdziError,
    marinade,
    state::{Beneficiary, Treasury, Vault},
};

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = owner,
        space = Vault::space(Vault::MAX_BENEFICIARIES),
        seeds = [b"vault", owner.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,
    pub system_program: Program<'info, System>,
    // When staking_enabled=true, remaining_accounts must contain:
    //   [0] msol_mint, [1] vault_msol_ata, [2] associated_token_program, [3] token_program
    //   If deposit_amount > 0, also [4..15] Marinade deposit accounts (11)
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateVault<'info>>,
    enable_watcher: bool,
    inactivity_period: i64,
    grace_period: i64,
    deposit_amount: u64,
    staking_enabled: bool,
    beneficiaries: Vec<Beneficiary>,
) -> Result<()> {
    require!(
        inactivity_period >= Vault::MIN_INACTIVITY_PERIOD,
        AnderdziError::InactivityPeriodTooShort
    );
    require!(
        grace_period >= Vault::MIN_GRACE_PERIOD,
        AnderdziError::GracePeriodTooShort
    );

    // If user wants watcher, treasury must have a default configured
    if enable_watcher {
        require!(
            ctx.accounts.treasury.default_watcher.is_some(),
            AnderdziError::NoDefaultWatcher
        );
    }

    let vault = &mut ctx.accounts.vault;

    vault.owner = ctx.accounts.owner.key();
    vault.watcher_enabled = enable_watcher;
    vault.inactivity_period = inactivity_period;
    vault.grace_period = grace_period;
    vault.total_deposited = 0;
    vault.staking_enabled = staking_enabled;
    vault.bump = ctx.bumps.vault;
    vault.touch()?;
    vault.set_beneficiaries(beneficiaries)?;

    if deposit_amount > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: vault.to_account_info(),
                },
            ),
            deposit_amount,
        )?;
        vault.total_deposited = deposit_amount;
    }

    // If staking requested, create mSOL ATA and optionally stake the deposit
    if staking_enabled {
        require!(
            ctx.remaining_accounts.len() >= 4,
            AnderdziError::InvalidMarinadeAccounts
        );

        let msol_mint = &ctx.remaining_accounts[0];
        let vault_msol_ata = &ctx.remaining_accounts[1];
        let associated_token_program = &ctx.remaining_accounts[2];
        let token_program = &ctx.remaining_accounts[3];

        require!(
            msol_mint.key() == marinade::MSOL_MINT,
            AnderdziError::InvalidMarinadeAccounts
        );
        require!(
            associated_token_program.key() == anchor_spl::associated_token::ID,
            AnderdziError::InvalidMarinadeAccounts
        );
        require!(
            token_program.key() == anchor_spl::token::ID,
            AnderdziError::InvalidMarinadeAccounts
        );

        // Create the vault's mSOL ATA via CPI to the associated token program
        let create_ata_ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: anchor_spl::associated_token::ID,
            accounts: vec![
                AccountMeta::new(ctx.accounts.owner.key(), true),
                AccountMeta::new(vault_msol_ata.key(), false),
                AccountMeta::new_readonly(vault.key(), false),
                AccountMeta::new_readonly(marinade::MSOL_MINT, false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(anchor_spl::token::ID, false),
            ],
            data: vec![1], // CreateIdempotent — safe if ATA already exists
        };

        invoke(
            &create_ata_ix,
            &[
                ctx.accounts.owner.to_account_info(),
                vault_msol_ata.clone(),
                vault.to_account_info(),
                msol_mint.clone(),
                ctx.accounts.system_program.to_account_info(),
                token_program.clone(),
            ],
        )?;

        // If there was an initial deposit, stake it via Marinade
        if deposit_amount > 0 {
            let marinade_accounts = marinade::MarinadeDepositAccounts::parse(
                &ctx.remaining_accounts[4..],
                &vault.key(),
            )?;

            let owner_key = ctx.accounts.owner.key();
            let vault_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[vault.bump]];

            marinade::deposit_via_remaining(
                &marinade_accounts,
                &vault.to_account_info(),
                deposit_amount,
                vault_seeds,
            )?;
        }
    }

    Ok(())
}
