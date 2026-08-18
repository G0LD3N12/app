pub mod cache;
pub mod installer;
pub mod player;
pub mod types;
pub mod voicebox;

use base64::prelude::*;
use cache::AudioCacheManager;
use player::NativeAudioPlayer;
use std::path::PathBuf;
use std::sync::Arc;
pub use types::{SpeechRequest, SpeechResponse, VoiceProfile, VoiceboxStatus};
use voicebox::VoiceboxClient;

pub struct AudioEngineService {
    cache: Arc<AudioCacheManager>,
    voicebox: Arc<VoiceboxClient>,
    player: Arc<NativeAudioPlayer>,
}

impl AudioEngineService {
    pub fn new(cache_dir: PathBuf) -> Self {
        Self {
            cache: Arc::new(AudioCacheManager::new(cache_dir)),
            voicebox: Arc::new(VoiceboxClient::new()),
            player: Arc::new(NativeAudioPlayer::new()),
        }
    }

    pub async fn check_voicebox_status(&self, url: Option<&str>) -> VoiceboxStatus {
        self.voicebox.check_health(url).await
    }

    pub async fn get_voicebox_profiles(&self, url: Option<&str>) -> Result<Vec<VoiceProfile>, String> {
        self.voicebox.get_profiles(url).await
    }

    pub async fn synthesize(&self, req: SpeechRequest) -> Result<SpeechResponse, String> {
        if req.text.trim().is_empty() {
            return Err("Text is empty".to_string());
        }

        let hash = AudioCacheManager::compute_hash(
            &req.text,
            req.translation.as_deref(),
            req.profile_id.as_deref(),
            req.engine.as_deref(),
            req.language.as_deref(),
        );

        // 1. Check disk cache
        if let Some((cached_bytes, mime)) = self.cache.get_cached_audio(&hash) {
            let b64 = BASE64_STANDARD.encode(&cached_bytes);
            return Ok(SpeechResponse {
                success: true,
                audio_base64: Some(b64),
                mime_type: mime,
                generation_id: None,
                cached: true,
                error: None,
            });
        }

        // 2. Call Voicebox /speak
        match self.voicebox.speak(&req).await {
            Ok((bytes, mime, gen_id)) => {
                // Store in cache
                let _ = self.cache.store_audio(
                    &hash,
                    &bytes,
                    &req.text,
                    req.translation.as_deref(),
                    req.profile_id.as_deref(),
                    req.engine.as_deref(),
                    req.language.as_deref(),
                    req.max_cache_mb,
                );

                let b64 = BASE64_STANDARD.encode(&bytes);
                Ok(SpeechResponse {
                    success: true,
                    audio_base64: Some(b64),
                    mime_type: mime,
                    generation_id: gen_id,
                    cached: false,
                    error: None,
                })
            }
            Err(e) => Ok(SpeechResponse {
                success: false,
                audio_base64: None,
                mime_type: "audio/wav".to_string(),
                generation_id: None,
                cached: false,
                error: Some(e),
            }),
        }
    }

    pub async fn play_audio_bytes(&self, bytes: &[u8], speed: f32, offset_sec: f32) -> Result<u64, String> {
        self.player.play_bytes(bytes, speed, offset_sec).await
    }

    pub async fn wait_playback(&self, seq: u64) -> player::PlaybackOutcome {
        self.player.wait_for(seq).await
    }

    pub async fn pause_playback(&self) {
        self.player.pause().await;
    }

    pub async fn resume_playback(&self) {
        self.player.resume().await;
    }

    pub async fn stop_playback(&self) {
        self.player.stop().await;
    }

    pub async fn is_playing(&self) -> bool {
        self.player.is_playing().await
    }

    pub async fn cancel_speech(&self, url: Option<&str>, generation_id: Option<&str>) -> Result<bool, String> {
        if let Some(gen_id) = generation_id {
            self.voicebox.cancel(url, gen_id).await
        } else {
            Ok(true)
        }
    }

    pub fn get_cache_size(&self) -> u64 {
        self.cache.get_total_size()
    }

    pub fn clear_cache(&self) -> Result<u64, String> {
        self.cache.clear_cache()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_audio_cache_hash_consistency() {
        let hash1 = AudioCacheManager::compute_hash("En el principio", Some("RV1909"), Some("narrator"), Some("qwen"), Some("es"));
        let hash2 = AudioCacheManager::compute_hash("En el principio", Some("RV1909"), Some("narrator"), Some("qwen"), Some("es"));
        assert_eq!(hash1, hash2);

        let hash_diff = AudioCacheManager::compute_hash("En el principio", Some("NVI"), Some("narrator"), Some("qwen"), Some("es"));
        assert_ne!(hash1, hash_diff);
    }

    #[test]
    fn test_audio_cache_store_and_retrieve() {
        let dir = tempdir().unwrap();
        let cache = AudioCacheManager::new(dir.path().to_path_buf());
        let hash = AudioCacheManager::compute_hash("Dios es amor", Some("VBL"), None, None, Some("es"));

        let dummy_audio = vec![0u8, 1, 2, 3, 4, 5];
        cache.store_audio(&hash, &dummy_audio, "Dios es amor", Some("VBL"), None, None, Some("es"), Some(10)).unwrap();

        let retrieved = cache.get_cached_audio(&hash);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().0, dummy_audio);
    }

    // Prueba interna contra un servidor Voicebox real:
    //   VERBUM_VOICEBOX_URL=http://127.0.0.1:17493 cargo test -- --ignored
    #[tokio::test]
    #[ignore = "set VERBUM_VOICEBOX_URL to run against a live Voicebox server"]
    async fn synthesize_end_to_end_against_live_voicebox() {
        let url = std::env::var("VERBUM_VOICEBOX_URL").expect("VERBUM_VOICEBOX_URL not set");
        let dir = tempdir().unwrap();
        let service = AudioEngineService::new(dir.path().to_path_buf());

        let status = service.check_voicebox_status(Some(&url)).await;
        assert!(status.available, "voicebox not available: {:?}", status.error);

        let profiles = service.get_voicebox_profiles(Some(&url)).await.expect("profiles");
        assert!(!profiles.is_empty());

        let req = SpeechRequest {
            text: "En el principio creó Dios los cielos y la tierra.".to_string(),
            profile_id: Some("verbum-narrator".to_string()),
            engine: Some("neural".to_string()),
            language: Some("es".to_string()),
            translation: Some("RV1909".to_string()),
            voicebox_url: Some(url.clone()),
            max_cache_mb: Some(10),
        };

        let first = service.synthesize(req.clone()).await.expect("first synthesize");
        assert!(first.success, "synthesize failed: {:?}", first.error);
        let audio = first.audio_base64.expect("audio_base64");
        assert!(audio.len() > 1000);
        assert_eq!(first.mime_type, "audio/mpeg");
        assert!(!first.cached);

        let bytes = BASE64_STANDARD.decode(&audio).unwrap();
        assert_eq!(bytes.len(), audio.len() * 3 / 4 - audio.chars().rev().take_while(|c| *c == '=').count());
        let has_id3 = bytes.starts_with(b"ID3");
        let has_sync = bytes.len() > 2 && bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0;
        assert!(has_id3 || has_sync, "payload is not MP3");

        // Second identical request must hit the disk cache
        let second = service.synthesize(req).await.expect("second synthesize");
        assert!(second.success);
        assert!(second.cached, "expected cached response");
        assert_eq!(second.mime_type, "audio/mpeg", "cached MP3 must keep its real mime");
    }
}
