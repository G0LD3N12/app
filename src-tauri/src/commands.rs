use crate::db::{BibleVersion, Book, SearchHit, StudyConceptDetail, VerseWithStudy};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn get_versions(state: State<'_, AppState>) -> Result<Vec<BibleVersion>, String> {
    state.db.get_versions()
}

#[tauri::command]
pub fn get_books(state: State<'_, AppState>) -> Result<Vec<Book>, String> {
    state.db.get_books()
}

#[tauri::command]
pub fn get_chapter(
    state: State<'_, AppState>,
    version_id: String,
    book_id: i32,
    chapter: i32,
) -> Result<Vec<VerseWithStudy>, String> {
    state.db.get_chapter(&version_id, book_id, chapter)
}

#[tauri::command]
pub fn search_bible(
    state: State<'_, AppState>,
    query: String,
    versions: Vec<String>,
    limit: Option<u32>,
) -> Result<Vec<SearchHit>, String> {
    state.db.search_bible(&query, versions, limit.unwrap_or(100))
}

#[tauri::command]
pub fn get_concept_detail(
    state: State<'_, AppState>,
    slug: String,
) -> Result<StudyConceptDetail, String> {
    state.db.get_concept_detail(&slug)
}

#[tauri::command]
pub fn get_all_concepts(
    state: State<'_, AppState>,
    include_image_data: Option<bool>,
) -> Result<Vec<StudyConceptDetail>, String> {
    state.db.get_all_concepts(include_image_data.unwrap_or(false))
}

#[tauri::command]
pub async fn analyze_selection_ai(
    state: State<'_, AppState>,
    request: crate::ai::SelectionStudyRequest,
    config: Option<crate::ai::AIProviderConfig>,
) -> Result<crate::ai::StudyExegesisResult, String> {
    let default_config = crate::ai::AIProviderConfig {
        provider_type: "ollama".to_string(),
        ollama_endpoint: "http://localhost:11434".to_string(),
        model_name: "qwen3:4b-instruct".to_string(),
        api_key: None,
        base_url: None,
        confirm_before_send: true,
        local_only_privacy: true,
    };
    let cfg = config.unwrap_or(default_config);

    // The pool hands the context builder a short-lived connection; it is
    // released before the async LLM call below
    let ctx = crate::ai::context_retrieval::build_selection_context(&state.db, &request)?;

    crate::ai::providers::execute_exegesis(&ctx, &request.depth, &cfg).await
}

#[tauri::command]
pub async fn test_ai_connection(
    config: crate::ai::AIProviderConfig,
) -> Result<crate::ai::AIConnectionStatus, String> {
    Ok(crate::ai::providers::ping_ai_provider(&config).await)
}

#[tauri::command]
pub async fn check_ollama_model_status(
    endpoint: String,
    model_name: String,
) -> Result<crate::ai::OllamaModelInstallStatus, String> {
    Ok(crate::ai::ollama_installer::check_ollama_status(&endpoint, &model_name).await)
}

#[tauri::command]
pub async fn install_or_pull_ollama_model(
    endpoint: String,
    model_name: String,
) -> Result<crate::ai::OllamaModelInstallStatus, String> {
    crate::ai::ollama_installer::install_or_pull_model(&endpoint, &model_name).await
}

#[tauri::command]
pub fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_maximize_window(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_window_decorations(window: tauri::Window, decorations: bool) -> Result<(), String> {
    window.set_decorations(decorations).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_voicebox_status(
    state: State<'_, AppState>,
    url: Option<String>,
) -> Result<crate::tts::VoiceboxStatus, String> {
    Ok(state.tts.check_voicebox_status(url.as_deref()).await)
}

#[tauri::command]
pub async fn get_voicebox_profiles(
    state: State<'_, AppState>,
    url: Option<String>,
) -> Result<Vec<crate::tts::VoiceProfile>, String> {
    state.tts.get_voicebox_profiles(url.as_deref()).await
}

#[tauri::command]
pub async fn synthesize_speech(
    state: State<'_, AppState>,
    request: crate::tts::SpeechRequest,
) -> Result<crate::tts::SpeechResponse, String> {
    state.tts.synthesize(request).await
}

#[tauri::command]
pub async fn cancel_speech(
    state: State<'_, AppState>,
    url: Option<String>,
    generation_id: Option<String>,
) -> Result<bool, String> {
    state.tts.cancel_speech(url.as_deref(), generation_id.as_deref()).await
}

#[tauri::command]
pub fn get_audio_cache_size(state: State<'_, AppState>) -> Result<u64, String> {
    Ok(state.tts.get_cache_size())
}

#[tauri::command]
pub fn clear_audio_cache(state: State<'_, AppState>) -> Result<u64, String> {
    state.tts.clear_cache()
}

#[tauri::command]
pub async fn auto_setup_voicebox(
    endpoint: Option<String>,
) -> Result<crate::tts::installer::VoiceboxSetupResult, String> {
    crate::tts::installer::start_or_setup_voicebox(endpoint.as_deref()).await
}

// Starts native playback only after the requested rate has been physically
// applied. The returned metadata is the source of truth for frontend timing.
#[tauri::command]
pub async fn start_native_audio(
    state: State<'_, AppState>,
    audio_base64: String,
    speed: Option<f32>,
    offset_sec: Option<f32>,
) -> Result<crate::tts::player::PlaybackSession, String> {
    use base64::prelude::*;
    let bytes = BASE64_STANDARD.decode(&audio_base64).map_err(|e| format!("Base64 decode error: {}", e))?;
    state.tts
        .play_audio_bytes(&bytes, speed.unwrap_or(1.0), offset_sec.unwrap_or(0.0))
        .await
}

// Resolves on the real native process exit. Keeping this separate from start
// lets the UI begin its progress clock from backend-confirmed timing data.
#[tauri::command]
pub async fn wait_native_audio(
    state: State<'_, AppState>,
    seq: u64,
) -> Result<crate::tts::player::PlaybackOutcome, String> {
    Ok(state.tts.wait_playback(seq).await)
}

#[tauri::command]
pub async fn pause_native_audio(state: State<'_, AppState>) -> Result<(), String> {
    state.tts.pause_playback().await;
    Ok(())
}

#[tauri::command]
pub async fn resume_native_audio(state: State<'_, AppState>) -> Result<(), String> {
    state.tts.resume_playback().await;
    Ok(())
}

#[tauri::command]
pub async fn stop_native_audio(state: State<'_, AppState>) -> Result<(), String> {
    state.tts.stop_playback().await;
    Ok(())
}

#[tauri::command]
pub async fn is_native_audio_playing(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.tts.is_playing().await)
}
