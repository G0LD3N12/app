use crate::db::{BibleVersion, Book, SearchHit, StudyConceptDetail, VerseWithStudy};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn get_versions(state: State<'_, AppState>) -> Result<Vec<BibleVersion>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_versions()
}

#[tauri::command]
pub fn get_books(state: State<'_, AppState>) -> Result<Vec<Book>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_books()
}

#[tauri::command]
pub fn get_chapter(
    state: State<'_, AppState>,
    version_id: String,
    book_id: i32,
    chapter: i32,
) -> Result<Vec<VerseWithStudy>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_chapter(&version_id, book_id, chapter)
}

#[tauri::command]
pub fn search_bible(
    state: State<'_, AppState>,
    query: String,
    versions: Vec<String>,
    limit: Option<u32>,
) -> Result<Vec<SearchHit>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.search_bible(&query, versions, limit.unwrap_or(100))
}

#[tauri::command]
pub fn get_concept_detail(
    state: State<'_, AppState>,
    slug: String,
) -> Result<StudyConceptDetail, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_concept_detail(&slug)
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
