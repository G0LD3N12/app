use hex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

// Cache entries are stored extensionless-content; detect the container from
// magic bytes so MP3 payloads are not misreported as WAV.
fn sniff_audio_mime(bytes: &[u8]) -> String {
    if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WAVE" {
        return "audio/wav".to_string();
    }
    let has_id3 = bytes.len() >= 3 && &bytes[0..3] == b"ID3";
    let has_frame_sync = bytes.len() >= 2 && bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0;
    if has_id3 || has_frame_sync {
        return "audio/mpeg".to_string();
    }
    "audio/wav".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioCacheMetadata {
    pub hash: String,
    pub text_preview: String,
    pub translation: Option<String>,
    pub profile_id: Option<String>,
    pub engine: Option<String>,
    pub language: Option<String>,
    pub size_bytes: u64,
    pub created_at: u64,
    pub last_accessed_at: u64,
}

pub struct AudioCacheManager {
    base_dir: PathBuf,
}

impl AudioCacheManager {
    pub fn new(app_cache_dir: PathBuf) -> Self {
        let base_dir = app_cache_dir.join("audio_cache");
        let _ = fs::create_dir_all(&base_dir);
        Self { base_dir }
    }

    pub fn compute_hash(
        text: &str,
        translation: Option<&str>,
        profile_id: Option<&str>,
        engine: Option<&str>,
        language: Option<&str>,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(text.trim().as_bytes());
        hasher.update(b"|");
        hasher.update(translation.unwrap_or("").trim().as_bytes());
        hasher.update(b"|");
        hasher.update(profile_id.unwrap_or("").trim().as_bytes());
        hasher.update(b"|");
        hasher.update(engine.unwrap_or("").trim().as_bytes());
        hasher.update(b"|");
        hasher.update(language.unwrap_or("es").trim().as_bytes());

        let result = hasher.finalize();
        hex::encode(result)
    }

    fn get_file_paths(&self, hash: &str) -> (PathBuf, PathBuf) {
        let audio_path = self.base_dir.join(format!("{}.wav", hash));
        let meta_path = self.base_dir.join(format!("{}.json", hash));
        (audio_path, meta_path)
    }

    pub fn get_cached_audio(&self, hash: &str) -> Option<(Vec<u8>, String)> {
        let (audio_path, meta_path) = self.get_file_paths(hash);
        if audio_path.exists() {
            if let Ok(bytes) = fs::read(&audio_path) {
                // Update last_accessed_at in metadata
                if let Ok(meta_content) = fs::read_to_string(&meta_path) {
                    if let Ok(mut meta) = serde_json::from_str::<AudioCacheMetadata>(&meta_content) {
                        meta.last_accessed_at = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();
                        let _ = fs::write(&meta_path, serde_json::to_string(&meta).unwrap_or_default());
                    }
                }
                let mime = sniff_audio_mime(&bytes);
                return Some((bytes, mime));
            }
        }
        None
    }

    #[allow(clippy::too_many_arguments)]
    pub fn store_audio(
        &self,
        hash: &str,
        bytes: &[u8],
        text: &str,
        translation: Option<&str>,
        profile_id: Option<&str>,
        engine: Option<&str>,
        language: Option<&str>,
        max_cache_mb: Option<u64>,
    ) -> Result<PathBuf, String> {
        let _ = fs::create_dir_all(&self.base_dir);
        let (audio_path, meta_path) = self.get_file_paths(hash);

        fs::write(&audio_path, bytes)
            .map_err(|e| format!("Failed to write cached audio file: {}", e))?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let preview: String = text.chars().take(80).collect();
        let meta = AudioCacheMetadata {
            hash: hash.to_string(),
            text_preview: preview,
            translation: translation.map(|s| s.to_string()),
            profile_id: profile_id.map(|s| s.to_string()),
            engine: engine.map(|s| s.to_string()),
            language: language.map(|s| s.to_string()),
            size_bytes: bytes.len() as u64,
            created_at: now,
            last_accessed_at: now,
        };

        if let Ok(meta_json) = serde_json::to_string_pretty(&meta) {
            let _ = fs::write(&meta_path, meta_json);
        }

        // Apply LRU pruning if max limit is specified
        if let Some(limit_mb) = max_cache_mb {
            if limit_mb > 0 {
                let _ = self.prune_lru(limit_mb * 1024 * 1024);
            }
        }

        Ok(audio_path)
    }

    pub fn get_total_size(&self) -> u64 {
        let mut total: u64 = 0;
        if let Ok(entries) = fs::read_dir(&self.base_dir) {
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    if meta.is_file() {
                        total += meta.len();
                    }
                }
            }
        }
        total
    }

    pub fn clear_cache(&self) -> Result<u64, String> {
        let total = self.get_total_size();
        if self.base_dir.exists() {
            fs::remove_dir_all(&self.base_dir)
                .map_err(|e| format!("Failed to clear audio cache: {}", e))?;
            let _ = fs::create_dir_all(&self.base_dir);
        }
        Ok(total)
    }

    pub fn prune_lru(&self, max_bytes: u64) -> Result<u64, String> {
        let current_size = self.get_total_size();
        if current_size <= max_bytes {
            return Ok(0);
        }

        let mut items: Vec<(AudioCacheMetadata, PathBuf, PathBuf)> = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.base_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(meta) = serde_json::from_str::<AudioCacheMetadata>(&content) {
                            let audio_path = self.base_dir.join(format!("{}.wav", meta.hash));
                            items.push((meta, audio_path, path));
                        }
                    }
                }
            }
        }

        // Sort by last_accessed_at ascending (oldest access first)
        items.sort_by_key(|(m, _, _)| m.last_accessed_at);

        let mut deleted_bytes: u64 = 0;
        let mut target_size = current_size;

        for (meta, audio_p, meta_p) in items {
            if target_size <= max_bytes {
                break;
            }
            if audio_p.exists() {
                let _ = fs::remove_file(&audio_p);
            }
            if meta_p.exists() {
                let _ = fs::remove_file(&meta_p);
            }
            deleted_bytes += meta.size_bytes;
            target_size = target_size.saturating_sub(meta.size_bytes);
        }

        Ok(deleted_bytes)
    }
}
