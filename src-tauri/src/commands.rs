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
