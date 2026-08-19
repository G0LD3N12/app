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
    #[serde(default)]
    pub installed: bool,
    pub url: String,
    pub version: Option<String>,
    pub active_engine: Option<String>,
    pub error: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::VoiceboxStatus;

    #[test]
    fn older_voicebox_status_payloads_default_to_not_installed() {
        let status: VoiceboxStatus = serde_json::from_value(serde_json::json!({
            "available": false,
            "url": "http://127.0.0.1:17493",
            "version": null,
            "active_engine": null,
            "gpu_available": null,
            "profiles_count": 0,
            "error": null
        }))
        .unwrap();

        assert!(!status.installed);
    }
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
