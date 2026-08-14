pub mod ai;
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

    let mut candidates = vec![
        PathBuf::from("resources"),
        PathBuf::from("src-tauri/resources"),
        PathBuf::from("../src-tauri/resources"),
    ];

    if let Ok(curr) = std::env::current_dir() {
        candidates.push(curr.join("resources"));
        candidates.push(curr.join("src-tauri").join("resources"));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("resources"));
            candidates.push(parent.join("../resources"));
        }
    }

    if let Some(manifest) = option_env!("CARGO_MANIFEST_DIR") {
        candidates.push(PathBuf::from(manifest).join("resources"));
    }

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
            commands::get_all_concepts,
            commands::analyze_selection_ai,
            commands::test_ai_connection,
            commands::check_ollama_model_status,
            commands::install_or_pull_ollama_model,
            commands::minimize_window,
            commands::toggle_maximize_window,
            commands::close_window,
            commands::set_window_decorations
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
