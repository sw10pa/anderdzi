use anyhow::{Context, Result};
use rusqlite::Connection;
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn open(path: &str) -> Result<Self> {
        let conn = Connection::open(path).context("Failed to open SQLite database")?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS subscriptions (
                vault_pubkey TEXT NOT NULL,
                chat_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                PRIMARY KEY (vault_pubkey, chat_id)
            );
            CREATE TABLE IF NOT EXISTS notifications_sent (
                vault_pubkey TEXT NOT NULL,
                chat_id INTEGER NOT NULL,
                notification_type TEXT NOT NULL,
                sent_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                PRIMARY KEY (vault_pubkey, chat_id, notification_type)
            );",
        )
        .context("Failed to initialize database schema")?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn subscribe(&self, vault_pubkey: &str, chat_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR IGNORE INTO subscriptions (vault_pubkey, chat_id) VALUES (?1, ?2)",
            (vault_pubkey, chat_id),
        )?;
        Ok(())
    }

    pub fn unsubscribe(&self, vault_pubkey: &str, chat_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM subscriptions WHERE vault_pubkey = ?1 AND chat_id = ?2",
            (vault_pubkey, chat_id),
        )?;
        // Also clear sent notifications
        conn.execute(
            "DELETE FROM notifications_sent WHERE vault_pubkey = ?1 AND chat_id = ?2",
            (vault_pubkey, chat_id),
        )?;
        Ok(())
    }

    pub fn get_subscribers(&self, vault_pubkey: &str) -> Result<Vec<i64>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT chat_id FROM subscriptions WHERE vault_pubkey = ?1")?;
        let rows = stmt
            .query_map([vault_pubkey], |row| row.get(0))?
            .collect::<std::result::Result<Vec<i64>, _>>()?;
        Ok(rows)
    }

    pub fn get_all_subscribed_vaults(&self) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT DISTINCT vault_pubkey FROM subscriptions")?;
        let rows = stmt
            .query_map([], |row| row.get(0))?
            .collect::<std::result::Result<Vec<String>, _>>()?;
        Ok(rows)
    }

    pub fn was_notification_sent(
        &self,
        vault_pubkey: &str,
        chat_id: i64,
        notification_type: &str,
    ) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM notifications_sent WHERE vault_pubkey = ?1 AND chat_id = ?2 AND notification_type = ?3",
            (vault_pubkey, chat_id, notification_type),
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn mark_notification_sent(
        &self,
        vault_pubkey: &str,
        chat_id: i64,
        notification_type: &str,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR IGNORE INTO notifications_sent (vault_pubkey, chat_id, notification_type) VALUES (?1, ?2, ?3)",
            (vault_pubkey, chat_id, notification_type),
        )?;
        Ok(())
    }

    /// Clear sent notifications for a vault when heartbeat resets the countdown.
    pub fn clear_notifications_for_vault(&self, vault_pubkey: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM notifications_sent WHERE vault_pubkey = ?1",
            [vault_pubkey],
        )?;
        Ok(())
    }
}
