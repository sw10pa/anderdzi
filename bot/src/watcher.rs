use anyhow::Result;
use tracing::info;

/// Watches registered vault owners for on-chain activity.
/// When activity is detected, submits a witness_activity instruction
/// to reset the vault's inactivity timer.
pub async fn run() -> Result<()> {
    info!("Activity watcher started");

    // TODO: load registered vaults from on-chain program accounts
    // TODO: for each vault, poll getSignaturesForAddress on the owner wallet
    // TODO: if activity detected, call witness_activity instruction

    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
    }
}
