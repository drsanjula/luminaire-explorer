use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

pub struct Db(pub Pool<Sqlite>);

pub async fn init(app_handle: &AppHandle) -> anyhow::Result<Pool<Sqlite>> {
    let app_dir = app_handle.path().app_data_dir()?;
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir)?;
    }
    let db_path = app_dir.join("luminaire.db");
    let pool = SqlitePoolOptions::new()
        .connect(&format!("sqlite:{}", db_path.to_string_lossy()))
        .await?;

    // Create tables
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS media (
            id TEXT PRIMARY KEY,
            path TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            kind TEXT NOT NULL,
            mime_type TEXT,
            size INTEGER,
            width INTEGER,
            height INTEGER,
            created_at DATETIME,
            modified_at DATETIME,
            exif_date DATETIME,
            indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_favorite BOOLEAN DEFAULT 0,
            thumbnail_path TEXT
        )"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            confidence REAL,
            source TEXT,
            FOREIGN KEY(media_id) REFERENCES media(id)
        )"
    ).execute(&pool).await?;

    Ok(pool)
}
