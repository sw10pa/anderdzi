use anyhow::{Context, Result};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;

mod api;
mod db;
mod notifier;
pub mod watcher;

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

    // Run watcher loop (with notification support)
    info!("Starting Anderdzi activity watcher bot...");
    watcher::run(state).await
}
