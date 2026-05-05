//! Automatic trigger and distribution executor.
//!
//! Permissionless — processes ALL program vaults regardless of watcher assignment.
//! Triggers vaults whose inactivity period has elapsed, and distributes vaults
//! whose grace period has elapsed after triggering.

use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
};
use tracing::{info, warn};

use crate::common::{self, VaultData};

/// Processes all vaults and submits trigger/distribute transactions where eligible.
/// Returns the number of actions taken.
pub fn execute(
    client: &RpcClient,
    payer: &Keypair,
    program_id: &Pubkey,
    current_time: i64,
) -> Result<ExecutorSummary> {
    let vaults = common::fetch_all_vaults(client, program_id)?;
    info!(count = vaults.len(), "Executor: fetched all program vaults");

    let mut summary = ExecutorSummary::default();

    for (vault_pda, vault_data) in &vaults {
        match execute_vault(
            client,
            payer,
            program_id,
            vault_pda,
            vault_data,
            current_time,
        ) {
            Ok(ExecutorAction::Triggered) => {
                info!(vault = %vault_pda, owner = %vault_data.owner, "Executor: triggered vault");
                summary.triggered += 1;
            }
            Ok(ExecutorAction::Distributed) => {
                info!(vault = %vault_pda, owner = %vault_data.owner, "Executor: distributed vault");
                summary.distributed_vaults.push(*vault_pda);
            }
            Ok(ExecutorAction::None) => {}
            Err(e) => {
                warn!(vault = %vault_pda, error = %e, "Executor: failed to process vault");
            }
        }
    }

    Ok(summary)
}

#[derive(Debug, Default)]
pub struct ExecutorSummary {
    pub triggered: u32,
    pub distributed_vaults: Vec<Pubkey>,
}

#[derive(Debug)]
enum ExecutorAction {
    None,
    Triggered,
    Distributed,
}

fn execute_vault(
    client: &RpcClient,
    payer: &Keypair,
    program_id: &Pubkey,
    vault_pda: &Pubkey,
    vault_data: &VaultData,
    current_time: i64,
) -> Result<ExecutorAction> {
    // Vault is triggered — attempt distribution if grace period elapsed
    if let Some(triggered_at) = vault_data.triggered_at {
        if current_time >= triggered_at + vault_data.grace_period {
            match submit_distribute(client, payer, program_id, vault_pda, vault_data) {
                Ok(_) => return Ok(ExecutorAction::Distributed),
                Err(e) => {
                    warn!(vault = %vault_pda, error = %e, "distribute failed (may already be distributed)");
                    return Ok(ExecutorAction::None);
                }
            }
        }
        return Ok(ExecutorAction::None);
    }

    // Inactivity period elapsed — attempt trigger
    if current_time >= vault_data.last_heartbeat + vault_data.inactivity_period {
        match submit_trigger(client, payer, program_id, vault_pda, vault_data) {
            Ok(_) => return Ok(ExecutorAction::Triggered),
            Err(e) => {
                warn!(vault = %vault_pda, error = %e, "trigger failed (may already be triggered)");
                return Ok(ExecutorAction::None);
            }
        }
    }

    Ok(ExecutorAction::None)
}

fn submit_trigger(
    client: &RpcClient,
    payer: &Keypair,
    program_id: &Pubkey,
    vault_pda: &Pubkey,
    vault_data: &VaultData,
) -> Result<()> {
    let mut accounts = vec![AccountMeta::new(*vault_pda, false)];

    // If staking is enabled, append Marinade unstake accounts + treasury_msol_ata as remaining_accounts
    if vault_data.staking_enabled {
        let vault_msol_ata = spl_associated_token_account::get_associated_token_address(
            vault_pda,
            &common::MSOL_MINT,
        );
        let (treasury_pda, _) = common::treasury_pda(program_id);
        let treasury_msol_ata = spl_associated_token_account::get_associated_token_address(
            &treasury_pda,
            &common::MSOL_MINT,
        );
        accounts.extend_from_slice(&[
            AccountMeta::new_readonly(common::MARINADE_PROGRAM_ID, false),
            AccountMeta::new(common::MARINADE_STATE, false),
            AccountMeta::new(common::MSOL_MINT, false),
            AccountMeta::new(common::LIQ_POOL_SOL_LEG_PDA, false),
            AccountMeta::new(common::LIQ_POOL_MSOL_LEG, false),
            AccountMeta::new(common::MARINADE_TREASURY_MSOL, false),
            AccountMeta::new(vault_msol_ata, false),
            AccountMeta::new_readonly(solana_sdk::system_program::id(), false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new(treasury_msol_ata, false), // [9] for auto-harvest
        ]);
    }

    let instruction = Instruction {
        program_id: *program_id,
        accounts,
        data: common::anchor_discriminator("trigger").to_vec(),
    };

    common::send_tx(client, payer, instruction)?;
    info!(vault = %vault_pda, staking = vault_data.staking_enabled, "trigger tx confirmed");
    Ok(())
}

fn submit_distribute(
    client: &RpcClient,
    payer: &Keypair,
    program_id: &Pubkey,
    vault_pda: &Pubkey,
    vault_data: &VaultData,
) -> Result<()> {
    let (treasury, _) = common::treasury_pda(program_id);

    let mut accounts = vec![
        AccountMeta::new(*vault_pda, false),
        AccountMeta::new(treasury, false),
    ];

    for beneficiary in &vault_data.beneficiaries {
        accounts.push(AccountMeta::new(beneficiary.wallet, false));
    }

    let instruction = Instruction {
        program_id: *program_id,
        accounts,
        data: common::anchor_discriminator("distribute").to_vec(),
    };

    common::send_tx(client, payer, instruction)?;
    info!(vault = %vault_pda, "distribute tx confirmed");
    Ok(())
}
