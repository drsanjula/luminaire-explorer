mod db;
mod scanner;
mod cache;

use tauri::Manager;
use tauri_plugin_opener::init;

#[tauri::command]
async fn scan_dir(path: String, state: tauri::State<'_, db::Db>) -> Result<usize, String> {
    scanner::scan_directory(&path, &state.0)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_media(state: tauri::State<'_, db::Db>) -> Result<Vec<serde_json::Value>, String> {
    sqlx::query_as::<_, sqlx::sqlite::SqliteRow>("SELECT * FROM media ORDER BY exif_date DESC, created_at DESC")
        .fetch_all(&state.0)
        .await
        .map_err(|e| e.to_string())
        .map(|rows| {
            rows.into_iter().map(|row| {
                use sqlx::Row;
                serde_json::json!({
                    "id": row.get::<String, _>("id"),
                    "path": row.get::<String, _>("path"),
                    "filename": row.get::<String, _>("filename"),
                    "kind": row.get::<String, _>("kind"),
                    "size": row.get::<i64, _>("size"),
                    "thumbnail_path": row.get::<Option<String>, _>("thumbnail_path"),
                })
            }).collect()
        })
}

#[tauri::command]
async fn generate_thumbnails(ids: Vec<String>, handle: tauri::AppHandle, state: tauri::State<'_, db::Db>) -> Result<usize, String> {
    let mut count = 0;
    for id in ids {
        // Fetch path from DB
        let path: String = sqlx::query_scalar("SELECT path FROM media WHERE id = ?")
            .bind(&id)
            .fetch_one(&state.0)
            .await
            .map_err(|e| e.to_string())?;

        match cache::generate_thumbnail(std::path::Path::new(&path), &id, &handle) {
            Ok(thumb_path) => {
                let thumb_path_str = thumb_path.to_string_lossy().to_string();
                sqlx::query("UPDATE media SET thumbnail_path = ? WHERE id = ?")
                    .bind(thumb_path_str)
                    .bind(&id)
                    .execute(&state.0)
                    .await
                    .map_err(|e| e.to_string())?;
                count += 1;
            }
            Err(e) => println!("Error generating thumbnail for {}: {}", id, e),
        }
    }
    Ok(count)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = db::init(&handle).await.expect("Failed to init DB");
                handle.manage(db::Db(pool));
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![scan_dir, get_media, generate_thumbnails])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
