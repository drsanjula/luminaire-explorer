use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;
use tauri::Manager;

pub fn get_thumbnail_dir(app_handle: &AppHandle) -> anyhow::Result<PathBuf> {
    let app_dir = app_handle.path().app_data_dir()?;
    let thumb_dir = app_dir.join("thumbnails");
    if !thumb_dir.exists() {
        std::fs::create_dir_all(&thumb_dir)?;
    }
    Ok(thumb_dir)
}

pub fn generate_thumbnail(
    source: &Path,
    id: &str,
    app_handle: &AppHandle,
) -> anyhow::Result<PathBuf> {
    let thumb_dir = get_thumbnail_dir(app_handle)?;
    let dest = thumb_dir.join(format!("{}.jpg", id));

    if dest.exists() {
        return Ok(dest);
    }

    // Use ffmpeg for both images and videos
    // For images, we just take one frame
    // For videos, we take a frame from the 1st second
    let status = Command::new("ffmpeg")
        .arg("-i")
        .arg(source)
        .arg("-vf")
        .arg("scale=320:-1") // Width 320, height auto
        .arg("-ss")
        .arg("00:00:01")
        .arg("-vframes")
        .arg("1")
        .arg("-f")
        .arg("image2")
        .arg(&dest)
        .status()?;

    if status.success() {
        Ok(dest)
    } else {
        // Fallback for images if ffmpeg fails (or if it's an image and we want to try another way)
        Err(anyhow::anyhow!("FFmpeg failed to generate thumbnail"))
    }
}
