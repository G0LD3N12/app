use serde::{Deserialize, Serialize};
use crate::db::ConceptImage;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SelectionType {
    Word,
    Phrase,
    Verse,
    Passage,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StudyDepth {
    Quick,
    Deep,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionStudyRequest {
    pub selected_text: String,
    pub book_id: i32,
    pub book_name: String,
    pub chapter: i32,
    pub start_verse: i32,
    pub end_verse: i32,
    pub version_id: String,
    pub depth: StudyDepth,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationContext {
    pub book_id: i32,
    pub book_name: String,
    pub testament: String,
    pub chapter: i32,
    pub start_verse: i32,
    pub end_verse: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerseSnippet {
    pub verse: i32,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationSnippet {
    pub version_id: String,
    pub version_short_name: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OccurrenceSnippet {
    pub book_name: String,
    pub chapter: i32,
    pub verse: i32,
    pub text_snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConceptSnippet {
    pub slug: String,
    pub term_es: String,
    pub term_en: Option<String>,
    pub strongs_code: Option<String>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaSnippet {
    pub id: String,
    pub title: String,
    pub caption: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionContext {
    pub selected_text: String,
    pub selection_type: SelectionType,
    pub location: LocationContext,
    pub primary_text: String,
    pub immediate_context: Vec<VerseSnippet>,
    pub parallel_translations: Vec<TranslationSnippet>,
    pub occurrences: Vec<OccurrenceSnippet>,
    pub matched_concepts: Vec<ConceptSnippet>,
    pub available_media: Vec<MediaSnippet>,
    pub available_images: Vec<ConceptImage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterpretiveNote {
    pub text: String,
    #[serde(default = "default_note_type")]
    pub note_type: String, // "observacion_textual", "inferencia_teologica", "tradicion_interpretativa"
}

fn default_note_type() -> String {
    "observacion_textual".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelatedPassage {
    pub book_name: String,
    pub chapter: i32,
    pub verse: i32,
    #[serde(default)]
    pub quote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudyExegesisResult {
    pub title: String,
    pub selection_type: String,
    pub depth: String,
    pub is_heuristic_offline: bool,
    pub summary: String,
    pub biblical_context: String,
    #[serde(default)]
    pub historical_cultural_context: Option<String>,
    #[serde(default)]
    pub linguistic_context: Option<String>,
    #[serde(default)]
    pub interpretive_notes: Vec<InterpretiveNote>,
    #[serde(default)]
    pub translation_nuance: Option<String>,
    #[serde(default)]
    pub related_passages: Vec<RelatedPassage>,
    #[serde(default)]
    pub recommended_media: Vec<String>,
    #[serde(default)]
    pub images: Vec<ConceptImage>,
    pub provider_used: String,
    pub model_used: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIProviderConfig {
    pub provider_type: String, // "ollama", "openai_compatible", "heuristic_offline"
    #[serde(default = "default_ollama_endpoint")]
    pub ollama_endpoint: String,
    #[serde(default = "default_model_name")]
    pub model_name: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    #[serde(default = "default_true")]
    pub confirm_before_send: bool,
    #[serde(default = "default_true")]
    pub local_only_privacy: bool,
}

fn default_ollama_endpoint() -> String {
    "http://localhost:11434".to_string()
}

fn default_model_name() -> String {
    "qwen3:4b-instruct".to_string()
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConnectionStatus {
    pub is_connected: bool,
    pub provider_type: String,
    pub model_name: String,
    pub message: String,
    pub latency_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelInstallStatus {
    pub is_ollama_running: bool,
    pub is_model_installed: bool,
    pub model_name: String,
    pub installed_models: Vec<String>,
    pub message: String,
    pub progress_percent: Option<f32>,
}
