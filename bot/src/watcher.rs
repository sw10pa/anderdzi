//! Activity watcher — monitors on-chain owner activity and submits
//! `witness_activity` transactions to reset inactivity timers.
//!
//! Only processes vaults assigned to this bot's watcher keypair.

use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcTransactionConfig;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use solana_transaction_status::{EncodedTransaction, UiMessage, UiTransactionEncoding};
use tracing::{info, warn};

use crate::common::{self, VaultData};

/// Checks all watcher-enabled vaults for owner activity.
/// Returns the list of vault pubkeys that were witnessed (heartbeat reset).
pub fn witness_active_vaults(
    client: &RpcClient,
    watcher: &Keypair,
    program_id: &Pubkey,
) -> Result<Vec<Pubkey>> {
    let vaults = common::fetch_watcher_enabled_vaults(client, program_id)?;
    info!(
        count = vaults.len(),
        "Watcher: fetched watcher-enabled vaults"
    );

    let mut witnessed = Vec::new();

    for (vault_pda, vault_data) in &vaults {
        // Skip triggered vaults — they're handled by the executor
        if vault_data.triggered_at.is_some() {
            continue;
        }

        match check_and_witness(client, watcher, program_id, vault_pda, vault_data) {
            Ok(true) => {
                info!(vault = %vault_pda, owner = %vault_data.owner, "Witnessed activity");
                witnessed.push(*vault_pda);
            }
            Ok(false) => {}
            Err(e) => {
                warn!(vault = %vault_pda, error = %e, "Failed to check/witness vault");
            }
        }
    }

    Ok(witnessed)
}

fn check_and_witness(
    client: &RpcClient,
    watcher: &Keypair,
    program_id: &Pubkey,
    vault_pda: &Pubkey,
    vault_data: &VaultData,
) -> Result<bool> {
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
    let (treasury, _) = common::treasury_pda(program_id);

    let instruction = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(*vault_pda, false),
            AccountMeta::new_readonly(treasury, false),
            AccountMeta::new_readonly(watcher.pubkey(), true),
        ],
        data: common::anchor_discriminator("witness_activity").to_vec(),
    };

    common::send_tx(client, watcher, instruction)?;
    info!(vault = %vault_pda, "witness_activity tx confirmed");
    Ok(())
}
