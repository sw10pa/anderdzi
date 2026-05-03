use anyhow::Result;
use teloxide::prelude::*;
use tracing::info;

mod notifier;
mod watcher;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();
    tracing_subscriber::fmt::init();

    info!("Starting Anderdzi bot...");

    let bot = Bot::from_env();

    tokio::select! {
        _ = watcher::run() => {},
        _ = notifier::run(bot) => {},
    }

    Ok(())
}
