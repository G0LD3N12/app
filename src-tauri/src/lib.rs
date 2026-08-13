pub mod commands;
pub mod db;

use db::DatabaseManager;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct AppState {
    pub db: Mutex<DatabaseManager>,
}

fn resolve_resource_dir(app: &AppHandle) -> PathBuf {
    if let Ok(res) = app.path().resource_dir() {
        if res.join("bible.db").exists() {
            return res;
        }
        if res.join("resources").join("bible.db").exists() {
            return res.join("resources");
        }
    }

    let candidates = [
        PathBuf::from("resources"),
        PathBuf::from("src-tauri/resources"),
        PathBuf::from("../src-tauri/resources"),
        PathBuf::from("/home/g0ld3n/Projects/verbum-desktop/src-tauri/resources"),
    ];

    for c in &candidates {
        if c.join("bible.db").exists() {
            return c.clone();
        }
    }

    PathBuf::from("src-tauri/resources")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Hardware acceleration optimization flags for WebKitGTK on Linux
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "0");
    std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "0");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let res_dir = resolve_resource_dir(app.handle());
            let db_mgr = DatabaseManager::new(res_dir)
                .expect("Failed to initialize SQLite DatabaseManager");
            app.manage(AppState {
                db: Mutex::new(db_mgr),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_versions,
            commands::get_books,
            commands::get_chapter,
            commands::search_bible,
            commands::get_concept_detail,
            commands::minimize_window,
            commands::toggle_maximize_window,
            commands::close_window,
            commands::set_window_decorations
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
