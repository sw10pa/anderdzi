use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use std::sync::Arc;
use tracing::{error, info, warn};

use crate::db::Database;

pub struct AppState {
    pub db: Database,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub vault_pubkey: String,
    pub chat_id: i64,
    pub message: String,
    pub signature: String,
    pub owner_pubkey: String,
}

#[derive(Serialize)]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
}

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/register", post(register_handler))
        .route("/unregister", post(unregister_handler))
        .with_state(state)
}

/// Verify that vault_pubkey is the correct PDA for the given owner.
/// This proves the owner actually corresponds to this vault without RPC calls.
fn verify_vault_ownership(vault_pubkey: &str, owner_pubkey: &str) -> Result<(), String> {
    let owner = Pubkey::from_str(owner_pubkey).map_err(|_| "Invalid owner pubkey")?;
    let vault = Pubkey::from_str(vault_pubkey).map_err(|_| "Invalid vault pubkey")?;

    let (expected_pda, _) =
        Pubkey::find_program_address(&[b"vault", owner.as_ref()], &crate::watcher::program_id());

    if vault != expected_pda {
        return Err("Vault pubkey does not match owner's PDA".to_string());
    }
    Ok(())
}

async fn register_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterRequest>,
) -> (StatusCode, Json<ApiResponse>) {
    // Validate inputs
    if Pubkey::from_str(&req.vault_pubkey).is_err() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: "Invalid vault pubkey".to_string(),
            }),
        );
    }

    // Verify vault PDA matches owner
    if let Err(e) = verify_vault_ownership(&req.vault_pubkey, &req.owner_pubkey) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: e,
            }),
        );
    }

    let expected_message = format!(
        "Connect Telegram {} to vault {}",
        req.chat_id, req.vault_pubkey
    );

    if req.message != expected_message {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: "Invalid message format".to_string(),
            }),
        );
    }

    if let Err(e) = verify_signature(&req.owner_pubkey, &req.message, &req.signature) {
        warn!(error = %e, "Signature verification failed");
        return (
            StatusCode::UNAUTHORIZED,
            Json(ApiResponse {
                success: false,
                message: "Unauthorized".to_string(),
            }),
        );
    }

    match state.db.subscribe(&req.vault_pubkey, req.chat_id) {
        Ok(_) => {
            info!(
                vault = %req.vault_pubkey,
                chat_id = req.chat_id,
                "New subscription registered"
            );
            (
                StatusCode::OK,
                Json(ApiResponse {
                    success: true,
                    message: "Subscribed to notifications".to_string(),
                }),
            )
        }
        Err(e) => {
            error!(error = %e, "Failed to register subscription");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: "Internal error".to_string(),
                }),
            )
        }
    }
}

async fn unregister_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterRequest>,
) -> (StatusCode, Json<ApiResponse>) {
    if Pubkey::from_str(&req.vault_pubkey).is_err() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: "Invalid vault pubkey".to_string(),
            }),
        );
    }

    if let Err(e) = verify_vault_ownership(&req.vault_pubkey, &req.owner_pubkey) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: e,
            }),
        );
    }

    let expected_message = format!(
        "Disconnect Telegram {} from vault {}",
        req.chat_id, req.vault_pubkey
    );

    if req.message != expected_message {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: "Invalid message format".to_string(),
            }),
        );
    }

    if let Err(e) = verify_signature(&req.owner_pubkey, &req.message, &req.signature) {
        warn!(error = %e, "Signature verification failed");
        return (
            StatusCode::UNAUTHORIZED,
            Json(ApiResponse {
                success: false,
                message: "Unauthorized".to_string(),
            }),
        );
    }

    match state.db.unsubscribe(&req.vault_pubkey, req.chat_id) {
        Ok(_) => {
            info!(
                vault = %req.vault_pubkey,
                chat_id = req.chat_id,
                "Subscription removed"
            );
            (
                StatusCode::OK,
                Json(ApiResponse {
                    success: true,
                    message: "Unsubscribed from notifications".to_string(),
                }),
            )
        }
        Err(e) => {
            error!(error = %e, "Failed to unregister subscription");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: "Internal error".to_string(),
                }),
            )
        }
    }
}

fn verify_signature(pubkey_b58: &str, message: &str, signature_b58: &str) -> anyhow::Result<()> {
    let pubkey_bytes = bs58::decode(pubkey_b58)
        .into_vec()
        .map_err(|e| anyhow::anyhow!("Invalid pubkey: {}", e))?;

    let sig_bytes = bs58::decode(signature_b58)
        .into_vec()
        .map_err(|e| anyhow::anyhow!("Invalid signature: {}", e))?;

    let verifying_key = VerifyingKey::from_bytes(
        &pubkey_bytes
            .try_into()
            .map_err(|_| anyhow::anyhow!("Pubkey must be 32 bytes"))?,
    )
    .map_err(|e| anyhow::anyhow!("Invalid ed25519 pubkey: {}", e))?;

    let signature = Signature::from_bytes(
        &sig_bytes
            .try_into()
            .map_err(|_| anyhow::anyhow!("Signature must be 64 bytes"))?,
    );

    verifying_key
        .verify(message.as_bytes(), &signature)
        .map_err(|e| anyhow::anyhow!("Signature mismatch: {}", e))?;

    Ok(())
}
