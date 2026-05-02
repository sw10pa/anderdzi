use anyhow::Result;
use teloxide::prelude::*;
use tracing::info;

/// Monitors vault states and sends Telegram notifications
/// when inactivity thresholds are approaching or triggered.
pub async fn run(_bot: Bot) -> Result<()> {
    info!("Notifier started");

    // TODO: load vault states from on-chain
    // TODO: for each vault approaching threshold, send Telegram notification
    // TODO: include deep link back to dApp for check-in

    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
    }
}
