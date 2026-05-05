//! Shared types, constants, and helpers used across bot modules.

use anyhow::{Context, Result};
use borsh::BorshDeserialize;
use sha2::{Digest, Sha256};
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcAccountInfoConfig;
use solana_client::rpc_config::RpcProgramAccountsConfig;
use solana_client::rpc_filter::{Memcmp, RpcFilterType};
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::str::FromStr;
use tracing::warn;

pub const VAULT_DISCRIMINATOR: [u8; 8] = [211, 8, 232, 43, 2, 152, 117, 119];

// Marinade mainnet addresses (same as programs/anderdzi/src/marinade.rs)
pub use solana_sdk::pubkey;

pub const MARINADE_PROGRAM_ID: Pubkey = pubkey!("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD");
pub const MARINADE_STATE: Pubkey = pubkey!("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC");
pub const MSOL_MINT: Pubkey = pubkey!("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So");

// Marinade pool PDAs (derived from Marinade program)
pub const LIQ_POOL_SOL_LEG_PDA: Pubkey = pubkey!("UefNb6z6yvArqe4cJHTXCqStRsKmWhGxnZzuHbikP5Q");
pub const LIQ_POOL_MSOL_LEG: Pubkey = pubkey!("7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE");
pub const MARINADE_TREASURY_MSOL: Pubkey = pubkey!("B1aLzaNMeFVAyQ6f3XbbUyKcH2YPHu2fqiEagmiF23VR");

/// On-chain Beneficiary layout (Borsh-deserialized).
#[derive(BorshDeserialize, Debug, Clone)]
#[allow(dead_code)]
pub struct BeneficiaryData {
    pub wallet: Pubkey,
    pub share_bps: u16,
}

/// On-chain Vault layout (Borsh-deserialized after 8-byte discriminator).
#[derive(BorshDeserialize, Debug)]
#[allow(dead_code)]
pub struct VaultData {
    pub owner: Pubkey,
    pub watcher_enabled: bool,
    pub inactivity_period: i64,
    pub last_heartbeat: i64,
    pub grace_period: i64,
    pub triggered_at: Option<i64>,
    pub beneficiaries: Vec<BeneficiaryData>,
    pub total_deposited: u64,
    pub staking_enabled: bool,
    pub bump: u8,
}

/// Returns the configured program ID from the environment.
pub fn program_id() -> Pubkey {
    let program_id_str = std::env::var("PROGRAM_ID").expect("PROGRAM_ID env var required");
    Pubkey::from_str(&program_id_str).expect("Invalid PROGRAM_ID")
}

/// Derives the treasury PDA for the program.
pub fn treasury_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"treasury"], program_id)
}

/// Computes the Anchor instruction discriminator for a given instruction name.
pub fn anchor_discriminator(name: &str) -> [u8; 8] {
    let mut hasher = Sha256::new();
    hasher.update(format!("global:{}", name).as_bytes());
    let result = hasher.finalize();
    let mut disc = [0u8; 8];
    disc.copy_from_slice(&result[..8]);
    disc
}

/// Signs, sends, and confirms a transaction paying with the given keypair.
pub fn send_tx(client: &RpcClient, payer: &Keypair, instruction: Instruction) -> Result<()> {
    let recent_blockhash = client
        .get_latest_blockhash()
        .context("Failed to get recent blockhash")?;

    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[payer],
        recent_blockhash,
    );

    client
        .send_and_confirm_transaction(&tx)
        .context("Transaction failed")?;

    Ok(())
}

/// Fetches all vault accounts for the program, optionally filtered by watcher.
pub fn fetch_all_vaults(
    client: &RpcClient,
    program_id: &Pubkey,
) -> Result<Vec<(Pubkey, VaultData)>> {
    let filters = vec![RpcFilterType::Memcmp(Memcmp::new_raw_bytes(
        0,
        VAULT_DISCRIMINATOR.to_vec(),
    ))];

    fetch_vaults_with_filters(client, program_id, filters)
}

/// Fetches vault accounts that have watcher_enabled = true.
pub fn fetch_watcher_enabled_vaults(
    client: &RpcClient,
    program_id: &Pubkey,
) -> Result<Vec<(Pubkey, VaultData)>> {
    let filters = vec![
        RpcFilterType::Memcmp(Memcmp::new_raw_bytes(0, VAULT_DISCRIMINATOR.to_vec())),
        // watcher_enabled (bool) is at byte offset 40 (8 discrim + 32 owner)
        RpcFilterType::Memcmp(Memcmp::new_raw_bytes(40, vec![1u8])),
    ];

    fetch_vaults_with_filters(client, program_id, filters)
}

fn fetch_vaults_with_filters(
    client: &RpcClient,
    program_id: &Pubkey,
    filters: Vec<RpcFilterType>,
) -> Result<Vec<(Pubkey, VaultData)>> {
    let config = RpcProgramAccountsConfig {
        filters: Some(filters),
        account_config: RpcAccountInfoConfig {
            encoding: Some(solana_account_decoder::UiAccountEncoding::Base64),
            commitment: Some(CommitmentConfig::confirmed()),
            ..Default::default()
        },
        ..Default::default()
    };

    let accounts = client
        .get_program_accounts_with_config(program_id, config)
        .context("getProgramAccounts failed - ensure RPC supports this method")?;

    let mut vaults = Vec::new();
    for (pubkey, account) in accounts {
        if account.data.len() < 8 {
            continue;
        }
        match VaultData::try_from_slice(&account.data[8..]) {
            Ok(vault) => vaults.push((pubkey, vault)),
            Err(e) => {
                warn!(account = %pubkey, error = %e, "Failed to deserialize vault");
            }
        }
    }

    Ok(vaults)
}

/// Fetches a single vault by its pubkey. Returns None if not found or invalid.
/// Returns Ok(Some(data)) if vault exists, Ok(None) if account is missing/closed,
/// Err on RPC or deserialization failures.
pub fn fetch_vault(client: &RpcClient, vault_pubkey: &Pubkey) -> anyhow::Result<Option<VaultData>> {
    use solana_client::client_error::ClientErrorKind;
    use solana_client::rpc_request::RpcError;

    match client.get_account_data(vault_pubkey) {
        Ok(data) if data.len() > 8 && data[..8] == VAULT_DISCRIMINATOR => {
            let vault = VaultData::try_from_slice(&data[8..])
                .map_err(|e| anyhow::anyhow!("Failed to deserialize vault: {}", e))?;
            Ok(Some(vault))
        }
        Ok(data) if data.is_empty() => Ok(None),
        Ok(_) => Ok(None), // wrong discriminator = not a vault
        Err(e) => {
            // Account not found is not an error — it means the vault was closed
            if matches!(e.kind(), ClientErrorKind::RpcError(RpcError::ForUser(_))) {
                let msg = e.to_string();
                if msg.contains("AccountNotFound") || msg.contains("could not find account") {
                    return Ok(None);
                }
            }
            Err(e.into())
        }
    }
}
