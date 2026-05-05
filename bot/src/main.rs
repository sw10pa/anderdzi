use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{read_keypair_file, Keypair, Signer},
};
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tower_http::cors::CorsLayer;
use tracing::{error, info};

mod api;
mod common;
mod db;
mod executor;
mod notifier;
pub mod watcher;

const POLL_INTERVAL_SECS: u64 = 3600;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();
    tracing_subscriber::fmt::init();

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "bot.db".to_string());
    let database = db::Database::open(&db_path).context("Failed to open database")?;

    let state = Arc::new(api::AppState { db: database });

    let api_port: u16 = std::env::var("API_PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse()
        .context("Invalid API_PORT")?;

    // Spawn HTTP API server
    let api_state = Arc::clone(&state);
    let app = api::create_router(api_state).layer(CorsLayer::permissive());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", api_port)).await?;
    info!(port = api_port, "API server starting");
    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            tracing::error!("API server exited with error: {}", e);
            std::process::exit(1);
        }
    });

    // Run main poll loop
    info!("Starting Anderdzi bot...");
    poll_loop(state).await
}

async fn poll_loop(state: Arc<api::AppState>) -> Result<()> {
    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
    let keypair_path =
        std::env::var("WATCHER_KEYPAIR_PATH").context("WATCHER_KEYPAIR_PATH env var required")?;
    let program_id_str = std::env::var("PROGRAM_ID").context("PROGRAM_ID env var required")?;
    let telegram_token = std::env::var("TELEGRAM_BOT_TOKEN").ok();

    let keypair = read_keypair_file(&keypair_path)
        .map_err(|e| anyhow::anyhow!("Failed to read watcher keypair: {}", e))?;
    let program_id = Pubkey::from_str(&program_id_str).context("Invalid PROGRAM_ID")?;

    info!(
        pubkey = %keypair.pubkey(),
        rpc = %rpc_url,
        notifications = telegram_token.is_some(),
        "Bot initialized"
    );

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    loop {
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        run_cycle(
            &client,
            &keypair,
            &program_id,
            &state,
            &telegram_token,
            current_time,
        )
        .await;

        tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
    }
}

async fn run_cycle(
    client: &RpcClient,
    keypair: &Keypair,
    program_id: &Pubkey,
    state: &Arc<api::AppState>,
    telegram_token: &Option<String>,
    current_time: i64,
) {
    // 1. Watcher: witness activity for assigned vaults (runs first to reset timers
    //    before executor checks for inactivity)
    match watcher::witness_active_vaults(client, keypair, program_id) {
        Ok(witnessed) => {
            for vault_pda in &witnessed {
                let _ = state
                    .db
                    .clear_notifications_for_vault(&vault_pda.to_string());
            }
        }
        Err(e) => error!("Watcher cycle failed: {:#}", e),
    }

    // 2. Executor: trigger/distribute eligible vaults (permissionless, all vaults)
    let distributed_vaults = match executor::execute(client, keypair, program_id, current_time) {
        Ok(summary) => {
            if summary.triggered > 0 || !summary.distributed_vaults.is_empty() {
                info!(
                    triggered = summary.triggered,
                    distributed = summary.distributed_vaults.len(),
                    "Executor cycle complete"
                );
            }
            summary.distributed_vaults
        }
        Err(e) => {
            error!("Executor cycle failed: {:#}", e);
            Vec::new()
        }
    };

    // 3. Notifier: send Telegram notifications for subscribed vaults
    if let Some(token) = telegram_token {
        notifier::notify_distributed(&state.db, token, &distributed_vaults).await;
        notifier::notify_all(client, state, current_time, token).await;
    }

    // 4. Purge subscription data for distributed vaults
    for vault_pubkey in &distributed_vaults {
        if let Err(e) = state.db.purge_vault_data(&vault_pubkey.to_string()) {
            error!(vault = %vault_pubkey, error = %e, "Failed to purge vault data");
        } else {
            info!(vault = %vault_pubkey, "Purged subscription data for distributed vault");
        }
    }

    // 5. Purge orphaned subscriptions for vaults closed outside executor
    // Only needed when Telegram is disabled (notify_all handles cleanup when enabled)
    if telegram_token.is_none() {
        notifier::purge_closed_vaults(client, state);
    }
}
