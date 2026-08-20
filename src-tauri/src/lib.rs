pub mod ai;
pub mod commands;
pub mod db;
pub mod tts;
pub mod windows_native;

use db::DatabaseManager;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tts::AudioEngineService;

pub struct AppState {
    pub db: DatabaseManager,
    pub tts: AudioEngineService,
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
    std::env::set_var("WEBKIT_FORCE_COMPOSITING_MODE", "1");
    std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "0");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                windows_native::initialize(&window, app.handle().clone())
                    .map_err(|error| Box::<dyn std::error::Error>::from(error))?;
            }

            let res_dir = resolve_resource_dir(app.handle());
            let db_mgr = DatabaseManager::new(res_dir)
                .expect("Failed to initialize SQLite DatabaseManager");
            
            let cache_dir = app.path().app_cache_dir().unwrap_or_else(|_| PathBuf::from(".cache"));
            let tts_service = AudioEngineService::new(cache_dir);

            app.manage(AppState { db: db_mgr, tts: tts_service });
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
            windows_native::get_windows_capabilities,
            windows_native::set_windows_appearance,
            windows_native::show_windows_system_menu,
            windows_native::start_windows_drag,
            commands::check_voicebox_status,
            commands::get_voicebox_profiles,
            commands::synthesize_speech,
            commands::cancel_speech,
            commands::get_audio_cache_size,
            commands::clear_audio_cache,
            commands::auto_setup_voicebox,
            commands::start_native_audio,
            commands::wait_native_audio,
            commands::pause_native_audio,
            commands::resume_native_audio,
            commands::stop_native_audio,
            commands::is_native_audio_playing
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
