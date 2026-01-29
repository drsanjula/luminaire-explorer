use std::path::Path;
use walkdir::WalkDir;
use sqlx::{Pool, Sqlite};
use uuid::Uuid;
use chrono::Utc;
use std::fs;
use std::fs::File;
use std::io::BufReader;
use exif::{In, Tag};

pub async fn scan_directory(
    path: &str,
    pool: &Pool<Sqlite>,
) -> anyhow::Result<usize> {
    let root = Path::new(path);
    if !root.is_dir() {
        return Err(anyhow::anyhow!("Not a directory"));
    }

    let mut count = 0;
    let mut conn = pool.acquire().await?;
    
    for entry in WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let file_path = entry.path();
        if is_media_file(file_path) {
            let path_str = file_path.to_string_lossy().to_string();
            let filename = file_path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let metadata = fs::metadata(file_path)?;
            let size = metadata.len() as i64;
            let modified = metadata.modified()?.into();
            let created = metadata.created().ok().map(|c| c.into());

            let kind = if is_image(file_path) { "image" } else { "video" };
            let id = Uuid::new_v4().to_string();

            let exif_date = if kind == "image" {
                get_exif_date(file_path).ok()
            } else {
                None
            };

            sqlx::query(
                "INSERT OR IGNORE INTO media (id, path, filename, kind, size, modified_at, created_at, exif_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(&path_str)
            .bind(&filename)
            .bind(kind)
            .bind(size)
            .bind(modified)
            .bind(created)
            .bind(exif_date)
            .execute(&mut *conn)
            .await?;

            count += 1;
        }
    }

    Ok(count)
}

fn is_media_file(path: &Path) -> bool {
    is_image(path) || is_video(path)
}

fn is_image(path: &Path) -> bool {
    let extensions = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "tiff", "bmp"];
    path.extension()
        .and_then(|s| s.to_str())
        .map(|s| extensions.contains(&s.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn is_video(path: &Path) -> bool {
    let extensions = ["mp4", "mkv", "mov", "avi", "webm", "m4v"];
    path.extension()
        .and_then(|s| s.to_str())
        .map(|s| extensions.contains(&s.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn get_exif_date(path: &Path) -> anyhow::Result<chrono::DateTime<Utc>> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let exifreader = exif::Reader::new();
    let exif = exifreader.read_from_container(&mut reader)?;

    if let Some(field) = exif.get_field(Tag::DateTimeOriginal, In::PRIMARY) {
        let datetime = field.display_value().to_string();
        // EXIF format is "YYYY:MM:DD HH:MM:SS"
        let parsed = chrono::NaiveDateTime::parse_from_str(&datetime, "%Y:%m:%d %H:%M:%S")?;
        return Ok(chrono::DateTime::from_naive_utc_and_offset(parsed, Utc));
    }
    Err(anyhow::anyhow!("No date found"))
}
