use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceProfile {
    pub id: String,
    pub name: String,
    pub engine: String,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceboxStatus {
    pub available: bool,
    pub url: String,
    pub version: Option<String>,
    pub active_engine: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeechRequest {
    pub text: String,
    pub profile_id: Option<String>,
    pub engine: Option<String>,
    pub language: Option<String>,
    pub translation: Option<String>,
    pub voicebox_url: Option<String>,
    pub max_cache_mb: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeechResponse {
    pub success: bool,
    pub audio_base64: Option<String>,
    pub mime_type: String,
    pub generation_id: Option<String>,
    pub cached: bool,
    pub error: Option<String>,
}
