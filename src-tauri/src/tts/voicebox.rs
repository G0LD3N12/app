use crate::tts::types::{SpeechRequest, VoiceProfile, VoiceboxStatus};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub struct VoiceboxClient {
    client: Client,
}

impl Default for VoiceboxClient {
    fn default() -> Self {
        Self::new()
    }
}

impl VoiceboxClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(45))
            .build()
            .unwrap_or_else(|_| Client::new());
        Self { client }
    }

    fn normalize_url(url: Option<&str>) -> String {
        url.unwrap_or("http://127.0.0.1:17493")
            .trim_end_matches('/')
            .to_string()
    }

    pub async fn check_health(&self, base_url: Option<&str>) -> VoiceboxStatus {
        let root = Self::normalize_url(base_url);
        let health_url = format!("{}/health", root);

        let ping_client = Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .unwrap_or_else(|_| Client::new());

        match ping_client.get(&health_url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    let mut version = None;
                    let mut active_engine = None;
                    if let Ok(val) = resp.json::<Value>().await {
                        if let Some(v) = val.get("version").and_then(|x| x.as_str()) {
                            version = Some(v.to_string());
                        }
                        if let Some(e) = val.get("engine").and_then(|x| x.as_str()) {
                            active_engine = Some(e.to_string());
                        } else if let Some(e) = val.get("active_engine").and_then(|x| x.as_str()) {
                            active_engine = Some(e.to_string());
                        }
                    }
                    VoiceboxStatus {
                        available: true,
                        url: root,
                        version,
                        active_engine,
                        error: None,
                    }
                } else {
                    VoiceboxStatus {
                        available: false,
                        url: root,
                        version: None,
                        active_engine: None,
                        error: Some(format!("HTTP status {}", resp.status())),
                    }
                }
            }
            Err(e) => VoiceboxStatus {
                available: false,
                url: root,
                version: None,
                active_engine: None,
                error: Some(format!("No response: {}", e)),
            },
        }
    }

    pub async fn get_profiles(&self, base_url: Option<&str>) -> Result<Vec<VoiceProfile>, String> {
        let root = Self::normalize_url(base_url);
        let profiles_url = format!("{}/profiles", root);

        let ping_client = Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap_or_else(|_| Client::new());

        let resp = ping_client
            .get(&profiles_url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch profiles from Voicebox: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Voicebox returned error code: {}", resp.status()));
        }

        let val: Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse profiles JSON: {}", e))?;

        let mut list: Vec<VoiceProfile> = Vec::new();

        let raw_profiles = if let Some(arr) = val.as_array() {
            arr.clone()
        } else if let Some(arr) = val.get("profiles").and_then(|p| p.as_array()) {
            arr.clone()
        } else {
            Vec::new()
        };

        for p in raw_profiles {
            let id = p.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let name = p
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or(&id)
                .to_string();
            let engine = p
                .get("preset_engine")
                .or_else(|| p.get("engine"))
                .and_then(|v| v.as_str())
                .unwrap_or("qwen")
                .to_string();
            let language = p
                .get("language")
                .or_else(|| p.get("preset_language"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            if !id.is_empty() {
                list.push(VoiceProfile {
                    id,
                    name,
                    engine,
                    language,
                });
            }
        }

        Ok(list)
    }

    pub async fn speak(&self, req: &SpeechRequest) -> Result<(Vec<u8>, String, Option<String>), String> {
        let root = Self::normalize_url(req.voicebox_url.as_deref());
        let speak_url = format!("{}/speak", root);

        let mut payload = serde_json::Map::new();
        payload.insert("text".to_string(), Value::String(req.text.clone()));

        if let Some(ref p) = req.profile_id {
            payload.insert("profile".to_string(), Value::String(p.clone()));
            payload.insert("profile_id".to_string(), Value::String(p.clone()));
        }
        if let Some(ref eng) = req.engine {
            payload.insert("engine".to_string(), Value::String(eng.clone()));
        }
        if let Some(ref lang) = req.language {
            payload.insert("language".to_string(), Value::String(lang.clone()));
        }

        let resp = self
            .client
            .post(&speak_url)
            .json(&Value::Object(payload))
            .send()
            .await
            .map_err(|e| format!("Request to Voicebox /speak failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Voicebox error {}: {}", status, err_text));
        }

        let content_type = resp
            .headers()
            .get("content-type")
            .and_then(|c| c.to_str().ok())
            .map(normalize_content_type)
            .unwrap_or_else(|| "audio/wav".to_string());

        // If response is raw binary audio
        if content_type.starts_with("audio/") || content_type.contains("octet-stream") {
            let bytes = resp
                .bytes()
                .await
                .map_err(|e| format!("Failed to read audio stream: {}", e))?;
            return Ok((bytes.to_vec(), content_type, None));
        }

        // If response is JSON containing generation_id or audio URL / base64
        let val: Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

        // 1. Direct audio base64 or audio_data
        if let Some(b64) = val.get("audio_base64").or_else(|| val.get("audio")).and_then(|v| v.as_str()) {
            if let Ok(bytes) = hex::decode(b64) {
                return Ok((bytes, "audio/wav".to_string(), None));
            }
        }

        // 2. Direct audio URL
        if let Some(audio_url) = val.get("audio_url").and_then(|v| v.as_str()) {
            let target_url = if audio_url.starts_with("http") {
                audio_url.to_string()
            } else {
                format!("{}{}", root, if audio_url.starts_with('/') { "" } else { "/" }) + audio_url
            };
            let audio_resp = self
                .client
                .get(&target_url)
                .send()
                .await
                .map_err(|e| format!("Failed to download audio from {}: {}", target_url, e))?;
            let dl_mime = audio_resp
                .headers()
                .get("content-type")
                .and_then(|c| c.to_str().ok())
                .map(normalize_content_type)
                .unwrap_or_else(|| "audio/wav".to_string());
            let bytes = audio_resp.bytes().await.map_err(|e| format!("Audio payload error: {}", e))?;
            return Ok((bytes.to_vec(), dl_mime, None));
        }

        // 3. Async generation ID polling
        if let Some(gen_id) = val.get("generation_id").or_else(|| val.get("id")).and_then(|v| v.as_str()) {
            let status_url = format!("{}/generate/{}/status", root, gen_id);
            let audio_download_url = format!("{}/generate/{}/audio", root, gen_id);

            // Poll status with timeout
            for _ in 0..60 {
                tokio::time::sleep(Duration::from_millis(500)).await;
                if let Ok(st_resp) = self.client.get(&status_url).send().await {
                    if let Ok(st_val) = st_resp.json::<Value>().await {
                        let status_str = st_val.get("status").and_then(|s| s.as_str()).unwrap_or("");
                        if status_str == "completed" || status_str == "ready" || status_str == "done" {
                            // Download final audio
                            let final_resp = self
                                .client
                                .get(&audio_download_url)
                                .send()
                                .await
                                .map_err(|e| format!("Failed to download generated audio: {}", e))?;
                            let dl_mime = final_resp
                                .headers()
                                .get("content-type")
                                .and_then(|c| c.to_str().ok())
                                .map(normalize_content_type)
                                .unwrap_or_else(|| "audio/wav".to_string());
                            let bytes = final_resp.bytes().await.map_err(|e| format!("Audio payload error: {}", e))?;
                            return Ok((bytes.to_vec(), dl_mime, Some(gen_id.to_string())));
                        } else if status_str == "failed" || status_str == "error" {
                            let err_msg = st_val
                                .get("error")
                                .and_then(|e| e.as_str())
                                .unwrap_or("Voicebox generation failed");
                            return Err(err_msg.to_string());
                        }
                    }
                }
            }
            return Err("Timed out waiting for Voicebox generation".to_string());
        }

        Err("Unrecognized Voicebox /speak response format".to_string())
    }

    pub async fn cancel(&self, base_url: Option<&str>, generation_id: &str) -> Result<bool, String> {
        let root = Self::normalize_url(base_url);
        let cancel_url = format!("{}/generate/{}/cancel", root, generation_id);

        let resp = self
            .client
            .post(&cancel_url)
            .send()
            .await
            .map_err(|e| format!("Failed to send cancel signal: {}", e))?;

        Ok(resp.status().is_success())
    }
}

fn normalize_content_type(raw: &str) -> String {
    let base = raw.split(';').next().unwrap_or(raw).trim().to_lowercase();
    if base.is_empty() {
        "audio/wav".to_string()
    } else {
        base
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    fn http_response(status: &str, content_type: &str, body: &[u8]) -> Vec<u8> {
        let head = format!(
            "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            status,
            content_type,
            body.len()
        );
        let mut resp = head.into_bytes();
        resp.extend_from_slice(body);
        resp
    }

    // Minimal one-shot HTTP server: each entry of `responses` answers exactly
    // one accepted connection, in order, then the server goes away.
    fn spawn_mock_server(responses: Vec<Vec<u8>>) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock server");
        let addr = listener.local_addr().unwrap();
        std::thread::spawn(move || {
            for resp in responses {
                if let Ok((mut stream, _)) = listener.accept() {
                    let mut buf = [0u8; 8192];
                    let _ = stream.read(&mut buf);
                    let _ = stream.write_all(&resp);
                    let _ = stream.flush();
                    let _ = stream.shutdown(std::net::Shutdown::Both);
                }
            }
        });
        format!("http://{}", addr)
    }

    fn speak_request(url: &str, text: &str) -> SpeechRequest {
        SpeechRequest {
            text: text.to_string(),
            profile_id: Some("verbum-narrator".to_string()),
            engine: Some("neural".to_string()),
            language: Some("es".to_string()),
            translation: Some("RV1909".to_string()),
            voicebox_url: Some(url.to_string()),
            max_cache_mb: None,
        }
    }

    #[tokio::test]
    async fn health_reports_available_and_engine() {
        let body = br#"{"status":"ok","version":"1.0.0","engine":"neural-tts"}"#;
        let url = spawn_mock_server(vec![http_response("200 OK", "application/json", body)]);

        let client = VoiceboxClient::new();
        let status = client.check_health(Some(&url)).await;

        assert!(status.available, "expected available, got error: {:?}", status.error);
        assert_eq!(status.version.as_deref(), Some("1.0.0"));
        assert_eq!(status.active_engine.as_deref(), Some("neural-tts"));
    }

    #[tokio::test]
    async fn health_unreachable_server_is_not_available() {
        // Bind and immediately drop the listener to get a free, closed port.
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        drop(listener);

        let client = VoiceboxClient::new();
        let status = client.check_health(Some(&url)).await;
        assert!(!status.available);
        assert!(status.error.is_some());
    }

    #[tokio::test]
    async fn profiles_parses_array_and_wrapped_formats() {
        let body = br#"{"profiles":[{"id":"p1","name":"Perfil Uno","preset_engine":"qwen","preset_language":"es"}]}"#;
        let url = spawn_mock_server(vec![http_response("200 OK", "application/json", body)]);

        let client = VoiceboxClient::new();
        let profiles = client.get_profiles(Some(&url)).await.expect("profiles");
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].id, "p1");
        assert_eq!(profiles[0].engine, "qwen");
        assert_eq!(profiles[0].language.as_deref(), Some("es"));
    }

    #[tokio::test]
    async fn speak_binary_audio_preserves_real_mime_type() {
        // Synthetic MP3 payload: ID3 header + frame sync so the format is detectable.
        let mut payload = Vec::new();
        payload.extend_from_slice(b"ID3\x04\x00\x00\x00\x00\x00\x00");
        payload.extend_from_slice(&[0xFF, 0xF3, 0x80, 0x00]);
        payload.extend_from_slice(&[0xAB; 512]);

        let url = spawn_mock_server(vec![http_response(
            "200 OK",
            "audio/mpeg; charset=binary",
            &payload,
        )]);

        let client = VoiceboxClient::new();
        let (bytes, mime, gen_id) = client
            .speak(&speak_request(&url, "En el principio"))
            .await
            .expect("speak should succeed");

        assert_eq!(bytes, payload);
        assert_eq!(mime, "audio/mpeg", "content type must be normalized without parameters");
        assert!(gen_id.is_none());
    }

    #[tokio::test]
    async fn speak_json_audio_url_downloads_payload() {
        let speak_body = br#"{"audio_url":"/files/verse-1"}"#;
        let wav_payload = b"RIFFxxxxWAVEfmt ".to_vec();

        let url = spawn_mock_server(vec![
            http_response("200 OK", "application/json", speak_body),
            http_response("200 OK", "audio/wav", &wav_payload),
        ]);

        let client = VoiceboxClient::new();
        let (bytes, mime, _) = client
            .speak(&speak_request(&url, "creó Dios"))
            .await
            .expect("speak should succeed");

        assert_eq!(bytes, wav_payload);
        assert_eq!(mime, "audio/wav");
    }

    #[tokio::test]
    async fn speak_generation_id_polls_until_completed() {
        let speak_body = br#"{"generation_id":"gen-123"}"#;
        let pending_body = br#"{"status":"pending"}"#;
        let completed_body = br#"{"status":"completed"}"#;
        let mp3_payload = vec![0xFF, 0xFB, 0x90, 0x00];

        let url = spawn_mock_server(vec![
            http_response("200 OK", "application/json", speak_body),
            http_response("200 OK", "application/json", pending_body),
            http_response("200 OK", "application/json", completed_body),
            http_response("200 OK", "audio/mpeg", &mp3_payload),
        ]);

        let client = VoiceboxClient::new();
        let (bytes, mime, gen_id) = client
            .speak(&speak_request(&url, "los cielos y la tierra"))
            .await
            .expect("speak should succeed");

        assert_eq!(bytes, mp3_payload);
        assert_eq!(mime, "audio/mpeg");
        assert_eq!(gen_id.as_deref(), Some("gen-123"));
    }

    #[tokio::test]
    async fn speak_error_status_returns_err() {
        let url = spawn_mock_server(vec![http_response(
            "500 Internal Server Error",
            "application/json",
            br#"{"detail":"boom"}"#,
        )]);

        let client = VoiceboxClient::new();
        let err = client
            .speak(&speak_request(&url, "texto"))
            .await
            .expect_err("must return Err on HTTP 500");
        assert!(err.contains("500"), "error should mention the status: {}", err);
    }

    #[test]
    fn normalize_content_type_strips_parameters() {
        assert_eq!(normalize_content_type("audio/mpeg; charset=binary"), "audio/mpeg");
        assert_eq!(normalize_content_type("  AUDIO/WAV "), "audio/wav");
        assert_eq!(normalize_content_type(""), "audio/wav");
    }
}
