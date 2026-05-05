//! Telegram notification system.
//!
//! Sends alerts to opted-in subscribers at threshold intervals before trigger,
//! on trigger, before distribution, and on distribution.

use reqwest::Client;
use serde_json::json;
use solana_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use std::sync::Arc;
use tracing::{error, info, warn};

use crate::api::AppState;
use crate::common::{self, VaultData};

const DAY_SECS: i64 = 86_400;

#[derive(Debug, Clone, Copy)]
pub enum NotificationType {
    DaysBefore30,
    DaysBefore7,
    DaysBefore1,
    Triggered,
    DaysBeforeDistribution1,
    Distributed,
}

impl NotificationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DaysBefore30 => "30d_before_trigger",
            Self::DaysBefore7 => "7d_before_trigger",
            Self::DaysBefore1 => "1d_before_trigger",
            Self::Triggered => "triggered",
            Self::DaysBeforeDistribution1 => "1d_before_distribution",
            Self::Distributed => "distributed",
        }
    }

    fn message(&self, vault_pubkey: &str) -> String {
        let key = short_key(vault_pubkey);
        match self {
            Self::DaysBefore30 => format!(
                "\u{26a0}\u{fe0f} Vault {} will trigger in ~30 days if no activity is detected. Consider signing a transaction.", key
            ),
            Self::DaysBefore7 => format!(
                "\u{1f6a8} Vault {} will trigger in ~7 days! Please sign a transaction to reset the countdown.", key
            ),
            Self::DaysBefore1 => format!(
                "\u{2757} URGENT: Vault {} triggers TOMORROW if no activity is detected!", key
            ),
            Self::Triggered => format!(
                "\u{1f534} Vault {} has been TRIGGERED. Grace period has started.", key
            ),
            Self::DaysBeforeDistribution1 => format!(
                "\u{23f0} Vault {} grace period ends TOMORROW. Distribution will become available.", key
            ),
            Self::Distributed => format!(
                "\u{2705} Vault {} has been distributed. Funds have been sent to beneficiaries.", key
            ),
        }
    }
}

fn short_key(key: &str) -> String {
    if key.len() > 8 {
        format!("{}...{}", &key[..4], &key[key.len() - 4..])
    } else {
        key.to_string()
    }
}

/// Sends "distributed" notifications for vaults that were just distributed.
/// Called with the list of vault pubkeys returned by the executor before the
/// vault accounts are gone from the chain.
pub async fn notify_distributed(
    db: &crate::db::Database,
    telegram_token: &str,
    distributed_vaults: &[Pubkey],
) {
    if distributed_vaults.is_empty() {
        return;
    }

    let client = Client::new();
    for vault_pubkey in distributed_vaults {
        let vault_str = vault_pubkey.to_string();
        let subscribers = match db.get_subscribers(&vault_str) {
            Ok(subs) => subs,
            Err(e) => {
                warn!(vault = %vault_str, error = %e, "Failed to get subscribers for distributed vault");
                continue;
            }
        };

        let notification = NotificationType::Distributed;
        for chat_id in &subscribers {
            match db.was_notification_sent(&vault_str, *chat_id, notification.as_str()) {
                Ok(true) => continue,
                Ok(false) => {}
                Err(e) => {
                    warn!(error = %e, "Dedupe check failed, skipping notification");
                    continue;
                }
            }

            let message = notification.message(&vault_str);
            match send_telegram_message(&client, telegram_token, *chat_id, &message).await {
                Ok(_) => {
                    if let Err(e) =
                        db.mark_notification_sent(&vault_str, *chat_id, notification.as_str())
                    {
                        error!(error = %e, "Failed to mark notification as sent");
                    }
                    info!(
                        vault = %vault_str,
                        chat_id,
                        kind = notification.as_str(),
                        "Distributed notification sent"
                    );
                }
                Err(e) => {
                    error!(
                        chat_id,
                        error = %e,
                        "Failed to send Telegram message"
                    );
                }
            }
        }
    }
}

/// Sends notifications for all subscribed vaults.
/// Also purges subscription data for vaults discovered to be closed on-chain.
pub async fn notify_all(
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

        match common::fetch_vault(client, &vault_pubkey) {
            Ok(Some(vault_data)) => {
                check_and_notify(
                    state,
                    &vault_pubkey_str,
                    &vault_data,
                    current_time,
                    telegram_token,
                )
                .await;
            }
            Ok(None) => {
                // Vault closed/distributed â purge inline to avoid double-fetch
                if let Err(e) = state.db.purge_vault_data(&vault_pubkey_str) {
                    error!(vault = %vault_pubkey_str, error = %e, "Failed to purge closed vault data");
                } else {
                    info!(vault = %vault_pubkey_str, "Purged subscription data for closed vault");
                }
            }
            Err(e) => {
                warn!(vault = %vault_pubkey_str, error = %e, "RPC error fetching vault, skipping");
            }
        }
    }
}

/// Purge subscription data for vaults that no longer exist on-chain.
/// Called when Telegram is disabled; when enabled, notify_all handles cleanup inline.
pub fn purge_closed_vaults(client: &RpcClient, state: &Arc<AppState>) {
    let subscribed_vaults = match state.db.get_all_subscribed_vaults() {
        Ok(v) => v,
        Err(e) => {
            warn!(error = %e, "Failed to get subscribed vaults for cleanup");
            return;
        }
    };

    for vault_pubkey_str in subscribed_vaults {
        let vault_pubkey = match Pubkey::from_str(&vault_pubkey_str) {
            Ok(pk) => pk,
            Err(_) => continue,
        };

        match common::fetch_vault(client, &vault_pubkey) {
            Ok(None) => {
                if let Err(e) = state.db.purge_vault_data(&vault_pubkey_str) {
                    error!(vault = %vault_pubkey_str, error = %e, "Failed to purge closed vault data");
                } else {
                    info!(vault = %vault_pubkey_str, "Purged subscription data for closed vault");
                }
            }
            Ok(Some(_)) => {} // Vault still exists
            Err(e) => {
                warn!(vault = %vault_pubkey_str, error = %e, "RPC error during cleanup, skipping");
            }
        }
    }
}

/// Check vault state and send applicable notifications.
pub async fn check_and_notify(
    state: &Arc<AppState>,
    vault_pubkey: &str,
    vault_data: &VaultData,
    current_time: i64,
    telegram_token: &str,
) {
    let subscribers = match state.db.get_subscribers(vault_pubkey) {
        Ok(subs) => subs,
        Err(e) => {
            warn!(vault = %vault_pubkey, error = %e, "Failed to get subscribers");
            return;
        }
    };

    if subscribers.is_empty() {
        return;
    }

    let notifications = determine_notifications(vault_data, current_time);

    let client = Client::new();
    for notification_type in notifications {
        for &chat_id in &subscribers {
            // Fail-closed: if dedupe check errors, skip sending (don't spam)
            match state
                .db
                .was_notification_sent(vault_pubkey, chat_id, notification_type.as_str())
            {
                Ok(true) => continue,
                Ok(false) => {}
                Err(e) => {
                    warn!(error = %e, "Dedupe check failed, skipping notification");
                    continue;
                }
            }

            let message = notification_type.message(vault_pubkey);
            match send_telegram_message(&client, telegram_token, chat_id, &message).await {
                Ok(_) => {
                    if let Err(e) = state.db.mark_notification_sent(
                        vault_pubkey,
                        chat_id,
                        notification_type.as_str(),
                    ) {
                        error!(error = %e, "Failed to mark notification as sent");
                    }
                    info!(
                        vault = %vault_pubkey,
                        chat_id,
                        kind = notification_type.as_str(),
                        "Notification sent"
                    );
                }
                Err(e) => {
                    error!(
                        chat_id,
                        error = %e,
                        "Failed to send Telegram message"
                    );
                }
            }
        }
    }
}

/// Determine which notification applies based on bounded time ranges.
fn determine_notifications(vault_data: &VaultData, current_time: i64) -> Vec<NotificationType> {
    let mut notifications = Vec::new();

    if let Some(triggered_at) = vault_data.triggered_at {
        let distribution_time = triggered_at + vault_data.grace_period;
        let time_until_distribution = distribution_time - current_time;

        if current_time >= distribution_time {
            notifications.push(NotificationType::Distributed);
        } else if time_until_distribution <= DAY_SECS {
            notifications.push(NotificationType::DaysBeforeDistribution1);
        }
        // Always notify about trigger state
        notifications.push(NotificationType::Triggered);
    } else {
        let trigger_time = vault_data.last_heartbeat + vault_data.inactivity_period;
        let time_until_trigger = trigger_time - current_time;

        if time_until_trigger <= DAY_SECS {
            notifications.push(NotificationType::DaysBefore1);
        } else if time_until_trigger <= 7 * DAY_SECS {
            notifications.push(NotificationType::DaysBefore7);
        } else if time_until_trigger <= 30 * DAY_SECS {
            notifications.push(NotificationType::DaysBefore30);
        }
    }

    notifications
}

async fn send_telegram_message(
    client: &Client,
    token: &str,
    chat_id: i64,
    text: &str,
) -> anyhow::Result<()> {
    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
    let response = client
        .post(&url)
        .json(&json!({
            "chat_id": chat_id,
            "text": text
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("Telegram API error: {}", body);
    }

    Ok(())
}
