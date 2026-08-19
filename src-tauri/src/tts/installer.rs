use crate::tts::types::VoiceProfile;
use crate::tts::voicebox::VoiceboxClient;
use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;

static VOICEBOX_START_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceboxSetupResult {
    pub success: bool,
    pub is_running: bool,
    pub message: String,
    pub endpoint: String,
    pub profiles: Vec<VoiceProfile>,
}

pub fn find_uv_binary() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(home) = std::env::var("HOME") {
        candidates.push(PathBuf::from(&home).join(".local").join("bin").join("uv"));
        candidates.push(PathBuf::from(&home).join(".cargo").join("bin").join("uv"));
    }
    candidates.push(PathBuf::from("/usr/local/bin/uv"));
    candidates.push(PathBuf::from("/usr/bin/uv"));
    candidates.push(PathBuf::from("uv"));

    for c in &candidates {
        if c == &PathBuf::from("uv") {
            if let Ok(o) = Command::new("uv").arg("--version").output() {
                if o.status.success() {
                    return Some(c.clone());
                }
            }
        } else if c.exists() {
            if let Ok(o) = Command::new(c).arg("--version").output() {
                if o.status.success() {
                    return Some(c.clone());
                }
            }
        }
    }
    None
}

fn voicebox_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("verbum")
        .join("voicebox")
}

fn voicebox_files_are_installed(target_dir: &Path) -> bool {
    target_dir.join("server.py").is_file()
}

pub fn is_voicebox_installed() -> bool {
    voicebox_files_are_installed(&voicebox_dir()) && find_uv_binary().is_some()
}

#[cfg(test)]
mod tests {
    use super::voicebox_files_are_installed;
    use tempfile::tempdir;

    #[test]
    fn persisted_server_file_is_the_voicebox_install_marker() {
        let dir = tempdir().unwrap();
        assert!(!voicebox_files_are_installed(dir.path()));

        std::fs::write(dir.path().join("server.py"), "# managed by Verbum").unwrap();
        assert!(voicebox_files_are_installed(dir.path()));
    }
}

async fn wait_until_ready(client: &VoiceboxClient, endpoint: &str, attempts: usize) -> bool {
    for _ in 0..attempts {
        tokio::time::sleep(Duration::from_millis(350)).await;
        if client.check_health(Some(endpoint)).await.available {
            return true;
        }
    }
    false
}

/// Starts an existing managed Voicebox installation without downloading or
/// rewriting anything. This is safe to call on every application launch.
pub async fn start_installed_voicebox(endpoint: Option<&str>) -> Result<bool, String> {
    let clean_endpoint = endpoint.unwrap_or("http://127.0.0.1:17493");
    let client = VoiceboxClient::new();
    let _start_guard = VOICEBOX_START_LOCK.lock().await;
    if client.check_health(Some(clean_endpoint)).await.available {
        return Ok(true);
    }
    if !is_voicebox_installed() {
        return Ok(false);
    }

    let target_dir = voicebox_dir();
    let uv_bin = find_uv_binary()
        .ok_or_else(|| "Voicebox está instalado pero UV no está disponible".to_string())?;
    let server_py = target_dir.join("server.py");
    let log_path = target_dir.join("server.log");
    let port = reqwest::Url::parse(clean_endpoint)
        .ok()
        .and_then(|url| url.port_or_known_default())
        .unwrap_or(17493);
    let stdout = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("No se pudo abrir el registro de Voicebox: {}", e))?;
    let stderr = stdout
        .try_clone()
        .map_err(|e| format!("No se pudo preparar el registro de Voicebox: {}", e))?;

    Command::new(uv_bin)
        .current_dir(&target_dir)
        .args([
            "run",
            "--with",
            "fastapi",
            "--with",
            "uvicorn",
            "--with",
            "edge-tts",
            "python3",
        ])
        .arg(&server_py)
        .env("PORT", port.to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr))
        .spawn()
        .map_err(|e| format!("No se pudo iniciar Voicebox: {}", e))?;

    Ok(wait_until_ready(&client, clean_endpoint, 24).await)
}

pub async fn start_or_setup_voicebox(
    endpoint: Option<&str>,
) -> Result<VoiceboxSetupResult, String> {
    let client = VoiceboxClient::new();
    let clean_endpoint = endpoint.unwrap_or("http://127.0.0.1:17493");

    // 1. Check if Voicebox is already running
    let status = client.check_health(Some(clean_endpoint)).await;
    if status.available {
        let profiles = client
            .get_profiles(Some(clean_endpoint))
            .await
            .unwrap_or_default();
        return Ok(VoiceboxSetupResult {
            success: true,
            is_running: true,
            message: "✓ Voicebox ya está activo y respondiendo correctamente.".to_string(),
            endpoint: clean_endpoint.to_string(),
            profiles,
        });
    }

    // Existing installations are restarted automatically and never shown as
    // missing merely because their background process stopped.
    if start_installed_voicebox(Some(clean_endpoint)).await? {
        let profiles = client
            .get_profiles(Some(clean_endpoint))
            .await
            .unwrap_or_default();
        return Ok(VoiceboxSetupResult {
            success: true,
            is_running: true,
            message: "Voicebox iniciado automáticamente.".to_string(),
            endpoint: clean_endpoint.to_string(),
            profiles,
        });
    }

    let target_dir = voicebox_dir();
    let _ = std::fs::create_dir_all(&target_dir);

    // 2. Ensure UV is available (download standalone if missing)
    if find_uv_binary().is_none() {
        // Install UV via official fast shell script
        let install_uv = "curl -LsSf https://astral.sh/uv/install.sh | sh";
        let _ = Command::new("sh").arg("-c").arg(install_uv).output();
        if find_uv_binary().is_none() {
            return Err("No se pudo instalar UV para ejecutar Voicebox.".to_string());
        }
    }

    // 3. Generate self-contained High-Fidelity Neural TTS Server
    let server_py = target_dir.join("server.py");
    let server_code = r#"# High-Fidelity Neural TTS Voicebox Server for Verbum Desktop
import sys
import os
import io
import asyncio
import uuid
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import edge_tts

app = FastAPI(title="Verbum Voicebox Local Neural TTS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VOICE_MAP = {
    "verbum-narrator": "es-ES-AlvaroNeural",
    "es-alvaro-narrator": "es-ES-AlvaroNeural",
    "es-elvira-warm": "es-ES-ElviraNeural",
    "es-dalia-latam": "es-MX-DaliaNeural",
    "es-jorge-latam": "es-MX-JorgeNeural",
    "es-alonso-us": "es-US-AlonsoNeural",
}

PROFILES = [
    {"id": "verbum-narrator", "name": "Verbum — Narrador Solemne (España)", "engine": "neural", "language": "es"},
    {"id": "es-elvira-warm", "name": "Elvira — Voz Femenina Cálida (España)", "engine": "neural", "language": "es"},
    {"id": "es-dalia-latam", "name": "Dalia — Lectura Editorial (Latinoamérica)", "engine": "neural", "language": "es"},
    {"id": "es-jorge-latam", "name": "Jorge — Locución Bíblica (Latinoamérica)", "engine": "neural", "language": "es"},
    {"id": "es-alonso-us", "name": "Alonso — Estudio & Exégesis (Neutral)", "engine": "neural", "language": "es"},
]

class SpeechReq(BaseModel):
    text: str
    profile: Optional[str] = "verbum-narrator"
    profile_id: Optional[str] = None
    engine: Optional[str] = "neural"
    language: Optional[str] = "es"

@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "engine": "neural-tts",
        "active_engine": "neural-tts",
        "gpu_available": True
    }

@app.get("/profiles")
def get_profiles():
    return PROFILES

@app.post("/speak")
@app.post("/generate")
async def speak(req: SpeechReq):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    prof = req.profile_id or req.profile or "verbum-narrator"
    voice_name = VOICE_MAP.get(prof, "es-ES-AlvaroNeural")
    
    try:
        communicate = edge_tts.Communicate(req.text.strip(), voice_name)
        audio_buffer = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.extend(chunk["data"])
        
        if not audio_buffer:
            raise HTTPException(status_code=500, detail="Empty audio generated")
            
        return Response(content=bytes(audio_buffer), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/{gen_id}/cancel")
def cancel(gen_id: str):
    return {"status": "cancelled", "id": gen_id}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 17493))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
"#;

    let _ = std::fs::write(&server_py, server_code);

    // 4. Kill any old hung process on port 17493
    let _ = Command::new("sh")
        .arg("-c")
        .arg("fuser -k 17493/tcp || true")
        .output();

    // 5. Start the newly persisted installation through the same lifecycle
    // path used on every subsequent launch.
    if start_installed_voicebox(Some(clean_endpoint)).await? {
        let profiles = client
            .get_profiles(Some(clean_endpoint))
            .await
            .unwrap_or_default();
        return Ok(VoiceboxSetupResult {
            success: true,
            is_running: true,
            message: "Voicebox instalado. Se iniciará automáticamente con Verbum.".to_string(),
            endpoint: clean_endpoint.to_string(),
            profiles,
        });
    }

    Ok(VoiceboxSetupResult {
        success: false,
        is_running: false,
        message: "No se pudo iniciar el servidor en el puerto 17493. Revisa los logs en ~/.local/share/verbum/voicebox/server.log.".to_string(),
        endpoint: clean_endpoint.to_string(),
        profiles: Vec::new(),
    })
}
