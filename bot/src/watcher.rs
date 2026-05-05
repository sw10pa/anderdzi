use anyhow::{Context, Result};
use borsh::BorshDeserialize;
use sha2::{Digest, Sha256};
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::{
    RpcAccountInfoConfig, RpcProgramAccountsConfig, RpcTransactionConfig,
};
use solana_client::rpc_filter::{Memcmp, RpcFilterType};
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{read_keypair_file, Keypair, Signer},
    transaction::Transaction,
};
use solana_transaction_status::{EncodedTransaction, UiMessage, UiTransactionEncoding};
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tracing::{error, info, warn};

use crate::api::AppState;
use crate::notifier;

const POLL_INTERVAL_SECS: u64 = 3600;

/// Returns the configured program ID. Called by api.rs for PDA verification.
pub fn program_id() -> Pubkey {
    let program_id_str = std::env::var("PROGRAM_ID").expect("PROGRAM_ID env var required");
    Pubkey::from_str(&program_id_str).expect("Invalid PROGRAM_ID")
}
const VAULT_DISCRIMINATOR: [u8; 8] = [211, 8, 232, 43, 2, 152, 117, 119];

/// On-chain Vault layout (Borsh-deserialized after 8-byte discriminator)
#[derive(BorshDeserialize, Debug)]
#[allow(dead_code)]
pub struct VaultData {
    pub owner: Pubkey,
    pub watcher: Option<Pubkey>,
    pub inactivity_period: i64,
    pub last_heartbeat: i64,
    pub grace_period: i64,
    pub triggered_at: Option<i64>,
}

pub async fn run(state: Arc<AppState>) -> Result<()> {
    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
    let keypair_path =
        std::env::var("WATCHER_KEYPAIR_PATH").context("WATCHER_KEYPAIR_PATH env var required")?;
    let program_id_str = std::env::var("PROGRAM_ID").context("PROGRAM_ID env var required")?;
    let telegram_token = std::env::var("TELEGRAM_BOT_TOKEN").ok();

    let watcher_keypair = read_keypair_file(&keypair_path)
        .map_err(|e| anyhow::anyhow!("Failed to read watcher keypair: {}", e))?;
    let program_id = Pubkey::from_str(&program_id_str).context("Invalid PROGRAM_ID")?;

    info!(
        watcher = %watcher_keypair.pubkey(),
        rpc = %rpc_url,
        notifications = telegram_token.is_some(),
        "Activity watcher initialized"
    );

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    loop {
        if let Err(e) = poll_and_witness(
            &client,
            &watcher_keypair,
            &program_id,
            &state,
            &telegram_token,
        )
        .await
        {
            error!("Poll cycle failed: {:#}", e);
        }
        tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
    }
}

async fn poll_and_witness(
    client: &RpcClient,
    watcher: &Keypair,
    program_id: &Pubkey,
    state: &Arc<AppState>,
    telegram_token: &Option<String>,
) -> Result<()> {
    let vaults = fetch_watched_vaults(client, watcher, program_id)?;
    info!(
        count = vaults.len(),
        "Fetched vaults assigned to this watcher"
    );

    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    for (vault_pda, vault_data) in &vaults {
        // Witness activity if detected
        match check_and_witness(client, watcher, program_id, vault_pda, vault_data) {
            Ok(witnessed) => {
                if witnessed {
                    info!(vault = %vault_pda, owner = %vault_data.owner, "Witnessed activity");
                    // Clear sent notifications since heartbeat was reset
                    let _ = state
                        .db
                        .clear_notifications_for_vault(&vault_pda.to_string());
                }
            }
            Err(e) => {
                warn!(vault = %vault_pda, error = %e, "Failed to process vault");
            }
        }

        // Send notifications if Telegram is configured
        if let Some(token) = telegram_token {
            notifier::check_and_notify(
                state,
                &vault_pda.to_string(),
                vault_data,
                current_time,
                token,
            )
            .await;
        }
    }

    // Also check vaults that have subscribers but might not be assigned to this watcher
    // (for notification-only subscriptions where someone else is the watcher)
    if let Some(token) = telegram_token {
        notify_subscribed_vaults(client, state, current_time, token).await;
    }

    Ok(())
}

/// Check vaults that have subscribers in our DB but may be watched by a different watcher.
async fn notify_subscribed_vaults(
    client: &RpcClient,
    state: &Arc<AppState>,
    current_time: i64,
    telegram_token: &str,
) {
    let subscribed_vaults = match state.db.get_all_subscribed_vaults() {
        Ok(v) => v,
        Err(e) => {
            warn!(error = %e, "Failed to get subscribed vaults");
            return;
        }
    };

    for vault_pubkey_str in subscribed_vaults {
        let vault_pubkey = match Pubkey::from_str(&vault_pubkey_str) {
            Ok(pk) => pk,
            Err(_) => continue,
        };

        // Fetch vault data directly
        match client.get_account_data(&vault_pubkey) {
            Ok(data) if data.len() > 8 => {
                if let Ok(vault_data) = VaultData::try_from_slice(&data[8..]) {
                    notifier::check_and_notify(
                        state,
                        &vault_pubkey_str,
                        &vault_data,
                        current_time,
                        telegram_token,
                    )
                    .await;
                }
            }
            _ => {}
        }
    }
}

fn fetch_watched_vaults(
    client: &RpcClient,
    watcher: &Keypair,
    program_id: &Pubkey,
) -> Result<Vec<(Pubkey, VaultData)>> {
    let mut watcher_filter_bytes = vec![1u8];
    watcher_filter_bytes.extend_from_slice(&watcher.pubkey().to_bytes());

    let filters = vec![
        RpcFilterType::Memcmp(Memcmp::new_raw_bytes(0, VAULT_DISCRIMINATOR.to_vec())),
        RpcFilterType::Memcmp(Memcmp::new_raw_bytes(40, watcher_filter_bytes)),
    ];

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

fn check_and_witness(
    client: &RpcClient,
    watcher: &Keypair,
    program_id: &Pubkey,
    vault_pda: &Pubkey,
    vault_data: &VaultData,
) -> Result<bool> {
    if vault_data.triggered_at.is_some() {
        return Ok(false);
    }

    let has_activity = detect_owner_activity(client, &vault_data.owner, vault_data.last_heartbeat)?;

    if has_activity {
        submit_witness_activity(client, watcher, program_id, vault_pda)?;
        return Ok(true);
    }

    Ok(false)
}

fn detect_owner_activity(client: &RpcClient, owner: &Pubkey, last_heartbeat: i64) -> Result<bool> {
    let sigs = client
        .get_signatures_for_address(owner)
        .context("getSignaturesForAddress failed")?;

    for sig_info in &sigs {
        let block_time = match sig_info.block_time {
            Some(t) => t,
            None => continue,
        };

        if block_time <= last_heartbeat {
            break;
        }

        if sig_info.err.is_some() {
            continue;
        }

        let sig = sig_info
            .signature
            .parse()
            .context("Failed to parse signature")?;

        let tx_config = RpcTransactionConfig {
            encoding: Some(UiTransactionEncoding::JsonParsed),
            commitment: Some(CommitmentConfig::confirmed()),
            max_supported_transaction_version: Some(0),
        };

        match client.get_transaction_with_config(&sig, tx_config) {
            Ok(tx_response) => {
                if is_owner_signer(&tx_response, owner) {
                    return Ok(true);
                }
            }
            Err(e) => {
                warn!(sig = %sig_info.signature, error = %e, "Failed to fetch tx");
                continue;
            }
        }
    }

    Ok(false)
}

fn is_owner_signer(
    tx_response: &solana_transaction_status::EncodedConfirmedTransactionWithStatusMeta,
    owner: &Pubkey,
) -> bool {
    match &tx_response.transaction.transaction {
        EncodedTransaction::Json(ui_tx) => match &ui_tx.message {
            UiMessage::Parsed(parsed) => parsed
                .account_keys
                .iter()
                .any(|k| k.signer && k.pubkey == owner.to_string()),
            UiMessage::Raw(raw) => {
                let n = raw.header.num_required_signatures as usize;
                raw.account_keys[..n]
                    .iter()
                    .any(|k| k == &owner.to_string())
            }
        },
        _ => false,
    }
}

fn submit_witness_activity(
    client: &RpcClient,
    watcher: &Keypair,
    program_id: &Pubkey,
    vault_pda: &Pubkey,
) -> Result<()> {
    let discriminator = anchor_discriminator("witness_activity");

    let instruction = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(*vault_pda, false),
            AccountMeta::new_readonly(watcher.pubkey(), true),
        ],
        data: discriminator.to_vec(),
    };

    let recent_blockhash = client
        .get_latest_blockhash()
        .context("Failed to get recent blockhash")?;

    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&watcher.pubkey()),
        &[watcher],
        recent_blockhash,
    );

    let sig = client
        .send_and_confirm_transaction(&tx)
        .context("Failed to send witness_activity transaction")?;

    info!(signature = %sig, vault = %vault_pda, "witness_activity submitted");
    Ok(())
}

fn anchor_discriminator(name: &str) -> [u8; 8] {
    let mut hasher = Sha256::new();
    hasher.update(format!("global:{}", name).as_bytes());
    let result = hasher.finalize();
    let mut disc = [0u8; 8];
    disc.copy_from_slice(&result[..8]);
    disc
}
