//! Marinade Finance CPI adapter module.
//! Manual CPI calls to avoid dependency on incompatible marinade-cpi crate.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed};

// --- Mainnet addresses (validated via Anchor address constraints in each instruction) ---

/// MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD
pub const MARINADE_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0x05, 0x45, 0xe3, 0x65, 0xbe, 0xf2, 0x71, 0xad, 0x75, 0x35, 0x03, 0x67, 0x56, 0x5d, 0xa4, 0x0d,
    0xa3, 0x36, 0xdc, 0x1c, 0x87, 0x9b, 0xb1, 0x54, 0x8a, 0x7a, 0xfc, 0xc5, 0x5a, 0xa9, 0x39, 0x1e,
]);

/// 8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC
pub const MARINADE_STATE: Pubkey = Pubkey::new_from_array([
    0x75, 0x11, 0x9b, 0x31, 0x75, 0x80, 0x75, 0x86, 0xe3, 0xf4, 0xa7, 0xe5, 0xcd, 0x0f, 0x89, 0x0e,
    0x96, 0xa7, 0x53, 0xb1, 0x0f, 0xcc, 0xc7, 0x68, 0x1e, 0x94, 0x73, 0xa0, 0x08, 0x32, 0x70, 0xf1,
]);

/// mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So
pub const MSOL_MINT: Pubkey = Pubkey::new_from_array([
    0x0b, 0x62, 0xba, 0x07, 0x4f, 0x72, 0x2c, 0x9d, 0x41, 0x14, 0xf2, 0xd8, 0xf7, 0x0a, 0x00, 0xc6,
    0x60, 0x02, 0x33, 0x7b, 0x9b, 0xf9, 0x0c, 0x87, 0x36, 0x57, 0xa6, 0xd2, 0x01, 0xdb, 0x4c, 0x80,
]);

const DEPOSIT_DISCRIMINATOR: [u8; 8] = [0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6];
const LIQUID_UNSTAKE_DISCRIMINATOR: [u8; 8] = [0x30, 0xb7, 0x3a, 0x8b, 0xa5, 0x2b, 0xd5, 0x2c];

/// CPI: Marinade deposit (SOL -> mSOL)
///
/// Accounts order (from Marinade source):
/// 0. state (mut)
/// 1. msol_mint (mut)
/// 2. liq_pool_sol_leg_pda (mut)
/// 3. liq_pool_msol_leg (mut)
/// 4. liq_pool_msol_leg_authority
/// 5. reserve_pda (mut)
/// 6. transfer_from (signer, mut) -- the vault PDA
/// 7. mint_to (mut) -- vault mSOL ATA
/// 8. msol_mint_authority
/// 9. system_program
/// 10. token_program
pub fn cpi_deposit<'info>(
    _program: &AccountInfo<'info>,
    accounts: &[AccountInfo<'info>; 11],
    lamports: u64,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let mut data = Vec::with_capacity(16);
    data.extend_from_slice(&DEPOSIT_DISCRIMINATOR);
    data.extend_from_slice(&lamports.to_le_bytes());

    let account_metas: Vec<AccountMeta> = vec![
        AccountMeta::new(*accounts[0].key, false),
        AccountMeta::new(*accounts[1].key, false),
        AccountMeta::new(*accounts[2].key, false),
        AccountMeta::new(*accounts[3].key, false),
        AccountMeta::new_readonly(*accounts[4].key, false),
        AccountMeta::new(*accounts[5].key, false),
        AccountMeta::new(*accounts[6].key, true),
        AccountMeta::new(*accounts[7].key, false),
        AccountMeta::new_readonly(*accounts[8].key, false),
        AccountMeta::new_readonly(*accounts[9].key, false),
        AccountMeta::new_readonly(*accounts[10].key, false),
    ];

    let ix = Instruction {
        program_id: MARINADE_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    invoke_signed(&ix, &accounts[..], &[signer_seeds])?;
    Ok(())
}

/// CPI: Marinade liquid_unstake (mSOL -> SOL, instant with fee)
///
/// Accounts order (from Marinade source):
/// 0. state (mut)
/// 1. msol_mint (mut)
/// 2. liq_pool_sol_leg_pda (mut)
/// 3. liq_pool_msol_leg (mut)
/// 4. treasury_msol_account (mut)
/// 5. get_msol_from (mut) -- vault mSOL ATA
/// 6. get_msol_from_authority (signer) -- vault PDA
/// 7. transfer_sol_to (mut) -- destination for SOL
/// 8. system_program
/// 9. token_program
pub fn cpi_liquid_unstake<'info>(
    _program: &AccountInfo<'info>,
    accounts: &[AccountInfo<'info>; 10],
    msol_amount: u64,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let mut data = Vec::with_capacity(16);
    data.extend_from_slice(&LIQUID_UNSTAKE_DISCRIMINATOR);
    data.extend_from_slice(&msol_amount.to_le_bytes());

    let account_metas: Vec<AccountMeta> = vec![
        AccountMeta::new(*accounts[0].key, false),
        AccountMeta::new(*accounts[1].key, false),
        AccountMeta::new(*accounts[2].key, false),
        AccountMeta::new(*accounts[3].key, false),
        AccountMeta::new(*accounts[4].key, false),
        AccountMeta::new(*accounts[5].key, false),
        AccountMeta::new_readonly(*accounts[6].key, true),
        AccountMeta::new(*accounts[7].key, false),
        AccountMeta::new_readonly(*accounts[8].key, false),
        AccountMeta::new_readonly(*accounts[9].key, false),
    ];

    let ix = Instruction {
        program_id: MARINADE_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    invoke_signed(&ix, &accounts[..], &[signer_seeds])?;
    Ok(())
}

/// Compute mSOL -> SOL value.
/// Formula: sol_value = (msol_amount * msol_price) / price_denominator
pub fn msol_to_sol(msol_amount: u64, msol_price: u64, price_denominator: u64) -> u64 {
    if price_denominator == 0 {
        return 0;
    }
    ((msol_amount as u128 * msol_price as u128) / price_denominator as u128) as u64
}

/// Compute SOL -> mSOL amount.
/// Formula: msol_amount = (lamports * price_denominator) / msol_price
pub fn sol_to_msol(lamports: u64, msol_price: u64, price_denominator: u64) -> u64 {
    if msol_price == 0 {
        return 0;
    }
    ((lamports as u128 * price_denominator as u128) / msol_price as u128) as u64
}

use crate::errors::AnderdziError;

/// Validated set of Marinade accounts for deposit (SOL -> mSOL).
/// Parsed from remaining_accounts with strict address validation.
pub struct MarinadeDepositAccounts<'a, 'info> {
    pub marinade_program: &'a AccountInfo<'info>,
    pub marinade_state: &'a AccountInfo<'info>,
    pub msol_mint: &'a AccountInfo<'info>,
    pub liq_pool_sol_leg_pda: &'a AccountInfo<'info>,
    pub liq_pool_msol_leg: &'a AccountInfo<'info>,
    pub liq_pool_msol_leg_authority: &'a AccountInfo<'info>,
    pub reserve_pda: &'a AccountInfo<'info>,
    pub vault_msol_ata: &'a AccountInfo<'info>,
    pub msol_mint_authority: &'a AccountInfo<'info>,
    pub system_program: &'a AccountInfo<'info>,
    pub token_program: &'a AccountInfo<'info>,
}

impl<'a, 'info> MarinadeDepositAccounts<'a, 'info> {
    /// Parse and validate deposit accounts from remaining_accounts.
    /// Expected order: marinade_program, marinade_state, msol_mint,
    /// liq_pool_sol_leg_pda, liq_pool_msol_leg, liq_pool_msol_leg_authority,
    /// reserve_pda, vault_msol_ata, msol_mint_authority, system_program, token_program
    /// Parse and validate deposit accounts. `vault_key` is used to derive and
    /// verify the canonical mSOL ATA so callers cannot redirect minted mSOL.
    pub fn parse(accounts: &'a [AccountInfo<'info>], vault_key: &Pubkey) -> Result<Self> {
        if accounts.len() < 11 {
            return Err(error!(AnderdziError::InvalidMarinadeAccounts));
        }
        require!(
            accounts[0].key() == MARINADE_PROGRAM_ID,
            AnderdziError::InvalidMarinadeAccounts
        );
        require!(
            accounts[1].key() == MARINADE_STATE,
            AnderdziError::InvalidMarinadeAccounts
        );
        require!(
            accounts[2].key() == MSOL_MINT,
            AnderdziError::InvalidMarinadeAccounts
        );
        // Validate vault_msol_ata is the canonical ATA for this vault
        let expected_ata = Pubkey::find_program_address(
            &[
                vault_key.as_ref(),
                anchor_spl::token::ID.as_ref(),
                MSOL_MINT.as_ref(),
            ],
            &anchor_spl::associated_token::ID,
        )
        .0;
        require!(
            accounts[7].key() == expected_ata,
            AnderdziError::InvalidMarinadeAccounts
        );
        Ok(Self {
            marinade_program: &accounts[0],
            marinade_state: &accounts[1],
            msol_mint: &accounts[2],
            liq_pool_sol_leg_pda: &accounts[3],
            liq_pool_msol_leg: &accounts[4],
            liq_pool_msol_leg_authority: &accounts[5],
            reserve_pda: &accounts[6],
            vault_msol_ata: &accounts[7],
            msol_mint_authority: &accounts[8],
            system_program: &accounts[9],
            token_program: &accounts[10],
        })
    }

    pub fn to_account_array(&self) -> [AccountInfo<'info>; 11] {
        [
            self.marinade_state.clone(),
            self.msol_mint.clone(),
            self.liq_pool_sol_leg_pda.clone(),
            self.liq_pool_msol_leg.clone(),
            self.liq_pool_msol_leg_authority.clone(),
            self.reserve_pda.clone(),
            // transfer_from (vault) is added by the caller
            // but for the array layout, slot 6 is transfer_from
            // We'll handle this differently - caller inserts vault
            self.vault_msol_ata.clone(), // placeholder
            self.vault_msol_ata.clone(),
            self.msol_mint_authority.clone(),
            self.system_program.clone(),
            self.token_program.clone(),
        ]
    }
}

/// Validated set of Marinade accounts for liquid unstake (mSOL -> SOL).
pub struct MarinadeUnstakeAccounts<'a, 'info> {
    pub marinade_program: &'a AccountInfo<'info>,
    pub marinade_state: &'a AccountInfo<'info>,
    pub msol_mint: &'a AccountInfo<'info>,
    pub liq_pool_sol_leg_pda: &'a AccountInfo<'info>,
    pub liq_pool_msol_leg: &'a AccountInfo<'info>,
    pub marinade_treasury_msol: &'a AccountInfo<'info>,
    pub vault_msol_ata: &'a AccountInfo<'info>,
    pub system_program: &'a AccountInfo<'info>,
    pub token_program: &'a AccountInfo<'info>,
}

impl<'a, 'info> MarinadeUnstakeAccounts<'a, 'info> {
    /// Parse and validate unstake accounts from remaining_accounts.
    /// Expected order: marinade_program, marinade_state, msol_mint,
    /// liq_pool_sol_leg_pda, liq_pool_msol_leg, marinade_treasury_msol,
    /// vault_msol_ata, system_program, token_program
    /// Parse and validate unstake accounts. `vault_key` is used to derive and
    /// verify the canonical mSOL ATA so callers cannot supply a fake ATA.
    pub fn parse(accounts: &'a [AccountInfo<'info>], vault_key: &Pubkey) -> Result<Self> {
        if accounts.len() < 9 {
            return Err(error!(AnderdziError::InvalidMarinadeAccounts));
        }
        require!(
            accounts[0].key() == MARINADE_PROGRAM_ID,
            AnderdziError::InvalidMarinadeAccounts
        );
        require!(
            accounts[1].key() == MARINADE_STATE,
            AnderdziError::InvalidMarinadeAccounts
        );
        require!(
            accounts[2].key() == MSOL_MINT,
            AnderdziError::InvalidMarinadeAccounts
        );
        // Validate vault_msol_ata is the canonical ATA for this vault
        let expected_ata = Pubkey::find_program_address(
            &[
                vault_key.as_ref(),
                anchor_spl::token::ID.as_ref(),
                MSOL_MINT.as_ref(),
            ],
            &anchor_spl::associated_token::ID,
        )
        .0;
        require!(
            accounts[6].key() == expected_ata,
            AnderdziError::InvalidMarinadeAccounts
        );
        Ok(Self {
            marinade_program: &accounts[0],
            marinade_state: &accounts[1],
            msol_mint: &accounts[2],
            liq_pool_sol_leg_pda: &accounts[3],
            liq_pool_msol_leg: &accounts[4],
            marinade_treasury_msol: &accounts[5],
            vault_msol_ata: &accounts[6],
            system_program: &accounts[7],
            token_program: &accounts[8],
        })
    }
}

/// Helper: perform Marinade deposit CPI using parsed remaining_accounts.
pub fn deposit_via_remaining<'info>(
    accounts: &MarinadeDepositAccounts<'_, 'info>,
    vault_info: &AccountInfo<'info>,
    amount: u64,
    vault_seeds: &[&[u8]],
) -> Result<()> {
    let accs: [AccountInfo<'info>; 11] = [
        accounts.marinade_state.clone(),
        accounts.msol_mint.clone(),
        accounts.liq_pool_sol_leg_pda.clone(),
        accounts.liq_pool_msol_leg.clone(),
        accounts.liq_pool_msol_leg_authority.clone(),
        accounts.reserve_pda.clone(),
        vault_info.clone(),
        accounts.vault_msol_ata.clone(),
        accounts.msol_mint_authority.clone(),
        accounts.system_program.clone(),
        accounts.token_program.clone(),
    ];
    cpi_deposit(accounts.marinade_program, &accs, amount, vault_seeds)
}

/// Helper: perform Marinade liquid unstake CPI using parsed remaining_accounts.
pub fn unstake_via_remaining<'info>(
    accounts: &MarinadeUnstakeAccounts<'_, 'info>,
    vault_info: &AccountInfo<'info>,
    destination_info: &AccountInfo<'info>,
    msol_amount: u64,
    vault_seeds: &[&[u8]],
) -> Result<()> {
    let accs: [AccountInfo<'info>; 10] = [
        accounts.marinade_state.clone(),
        accounts.msol_mint.clone(),
        accounts.liq_pool_sol_leg_pda.clone(),
        accounts.liq_pool_msol_leg.clone(),
        accounts.marinade_treasury_msol.clone(),
        accounts.vault_msol_ata.clone(),
        vault_info.clone(),
        destination_info.clone(),
        accounts.system_program.clone(),
        accounts.token_program.clone(),
    ];
    cpi_liquid_unstake(accounts.marinade_program, &accs, msol_amount, vault_seeds)
}

/// Read mSOL price from Marinade State account data.
/// Returns (msol_price_fp32, PRICE_DENOMINATOR).
pub fn parse_msol_price(data: &[u8]) -> Result<(u64, u64)> {
    const PRICE_DENOMINATOR: u64 = 0x1_0000_0000; // 2^32
    const MSOL_PRICE_OFFSET: usize = 648;
    const MIN_ACCOUNT_SIZE: usize = MSOL_PRICE_OFFSET + 8;

    if data.len() < MIN_ACCOUNT_SIZE {
        return Err(error!(AnderdziError::InvalidMarinadeState));
    }

    let msol_price = u64::from_le_bytes(
        data[MSOL_PRICE_OFFSET..MSOL_PRICE_OFFSET + 8]
            .try_into()
            .map_err(|_| error!(AnderdziError::InvalidMarinadeState))?,
    );

    if !(PRICE_DENOMINATOR..=PRICE_DENOMINATOR * 10).contains(&msol_price) {
        return Err(error!(AnderdziError::InvalidMarinadeState));
    }

    Ok((msol_price, PRICE_DENOMINATOR))
}

/// Auto-harvest protocol's 50% of accrued mSOL yield before unstaking.
/// Returns the user's yield share in SOL terms (for caller to adjust total_deposited).
/// Returns 0 if no yield or if harvest is skipped.
pub fn auto_harvest_yield<'info>(
    vault_msol_ata: &AccountInfo<'info>,
    treasury_msol_ata: &AccountInfo<'info>,
    marinade_state: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    vault_info: &AccountInfo<'info>,
    total_deposited: u64,
    vault_seeds: &[&[u8]],
) -> Result<u64> {
    // Validate treasury_msol_ata is the canonical ATA for the treasury PDA
    let treasury_pda = Pubkey::find_program_address(&[b"treasury"], &crate::ID).0;
    let expected_ata = Pubkey::find_program_address(
        &[
            treasury_pda.as_ref(),
            anchor_spl::token::ID.as_ref(),
            MSOL_MINT.as_ref(),
        ],
        &anchor_spl::associated_token::ID,
    )
    .0;
    require!(
        treasury_msol_ata.key() == expected_ata,
        AnderdziError::InvalidMarinadeAccounts
    );

    // Read mSOL price
    let marinade_data = marinade_state.try_borrow_data()?;
    let (msol_price, price_denominator) = parse_msol_price(&marinade_data)?;
    drop(marinade_data);

    // Read mSOL balance from raw account data
    let msol_data = vault_msol_ata.try_borrow_data()?;
    let msol_balance = u64::from_le_bytes(msol_data[64..72].try_into().unwrap());
    drop(msol_data);

    // Calculate yield
    let principal_msol = sol_to_msol(total_deposited, msol_price, price_denominator);
    let yield_msol = msol_balance.saturating_sub(principal_msol);
    if yield_msol == 0 {
        return Ok(0);
    }

    let protocol_share_msol = yield_msol / 2;
    let user_share_msol = yield_msol - protocol_share_msol;

    if protocol_share_msol > 0 {
        // SPL token transfer: vault_msol_ata -> treasury_msol_ata
        anchor_spl::token::transfer(
            anchor_lang::context::CpiContext::new_with_signer(
                token_program.clone(),
                anchor_spl::token::Transfer {
                    from: vault_msol_ata.clone(),
                    to: treasury_msol_ata.clone(),
                    authority: vault_info.clone(),
                },
                &[vault_seeds],
            ),
            protocol_share_msol,
        )?;
    }

    // Return user's yield share in SOL terms
    let user_share_sol = msol_to_sol(user_share_msol, msol_price, price_denominator);
    Ok(user_share_sol)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PRICE_DENOM: u64 = 0x1_0000_0000; // 2^32

    #[test]
    fn test_msol_to_sol_basic() {
        // 1 mSOL at rate 1.1 SOL/mSOL
        let price = (1.1 * PRICE_DENOM as f64) as u64;
        let result = msol_to_sol(1_000_000_000, price, PRICE_DENOM);
        assert_eq!(result, 1_099_999_999); // ~1.1 SOL (rounding)
    }

    #[test]
    fn test_sol_to_msol_basic() {
        // Convert 1.1 SOL to mSOL when rate is 1.1
        let price = (1.1 * PRICE_DENOM as f64) as u64;
        let result = sol_to_msol(1_100_000_000, price, PRICE_DENOM);
        // Should be ~1 mSOL
        assert!(result >= 999_999_999 && result <= 1_000_000_001);
    }

    #[test]
    fn test_round_trip() {
        let price = (1.08 * PRICE_DENOM as f64) as u64;
        let deposited = 100_000_000_000u64; // 100 SOL

        let msol = sol_to_msol(deposited, price, PRICE_DENOM);
        let sol_back = msol_to_sol(msol, price, PRICE_DENOM);
        assert!(deposited - sol_back <= 1);
    }

    #[test]
    fn test_yield_calculation() {
        // User deposited 100 SOL. Rate was 1.0, now 1.08.
        // They hold 100 SOL worth of mSOL at deposit time = 100/1.0 = 100 mSOL.
        // Now principal in mSOL = sol_to_msol(100 SOL, rate=1.08) = 100/1.08 ≈ 92.59 mSOL
        // Yield mSOL = 100 mSOL - 92.59 mSOL ≈ 7.41 mSOL
        // Protocol share = 3.7 mSOL
        let price = (1.08 * PRICE_DENOM as f64) as u64;
        let msol_balance = 100_000_000u64; // 100M lamports of mSOL
        let total_deposited = 100_000_000u64;

        let principal_msol = sol_to_msol(total_deposited, price, PRICE_DENOM);
        let yield_msol = msol_balance.saturating_sub(principal_msol);
        let protocol_share = yield_msol / 2;

        assert!(principal_msol > 92_000_000 && principal_msol < 93_000_000);
        assert!(yield_msol > 7_000_000 && yield_msol < 8_000_000);
        assert!(protocol_share > 3_500_000 && protocol_share < 4_000_000);
    }

    #[test]
    fn test_zero_safety() {
        assert_eq!(msol_to_sol(100, 200, 0), 0);
        assert_eq!(sol_to_msol(100, 0, 200), 0);
    }

    #[test]
    fn test_large_values_no_overflow() {
        let price = (1.1 * PRICE_DENOM as f64) as u64;
        let amount = 50_000_000_000_000_000u64; // 50M SOL in lamports
        let result = msol_to_sol(amount, price, PRICE_DENOM);
        // Should not overflow, result ≈ 55M SOL
        assert!(result > 54_000_000_000_000_000);
    }

    #[test]
    fn test_one_lamport_precision() {
        let price = PRICE_DENOM + 1; // barely above 1:1
        let result = sol_to_msol(1, price, PRICE_DENOM);
        // Should handle small amounts without panicking
        assert!(result <= 1);
    }

    #[test]
    fn test_exact_1_to_1_rate() {
        let result = msol_to_sol(1_000_000_000, PRICE_DENOM, PRICE_DENOM);
        assert_eq!(result, 1_000_000_000);
        let result2 = sol_to_msol(1_000_000_000, PRICE_DENOM, PRICE_DENOM);
        assert_eq!(result2, 1_000_000_000);
    }
}
