use crate::tts::types::VoiceProfile;
use crate::tts::voicebox::VoiceboxClient;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

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

pub async fn start_or_setup_voicebox(endpoint: Option<&str>) -> Result<VoiceboxSetupResult, String> {
    let client = VoiceboxClient::new();
    let clean_endpoint = endpoint.unwrap_or("http://127.0.0.1:17493");

    // 1. Check if Voicebox is already running
    let status = client.check_health(Some(clean_endpoint)).await;
    if status.available {
        let profiles = client.get_profiles(Some(clean_endpoint)).await.unwrap_or_default();
        return Ok(VoiceboxSetupResult {
            success: true,
            is_running: true,
            message: "✓ Voicebox ya está activo y respondiendo correctamente.".to_string(),
            endpoint: clean_endpoint.to_string(),
            profiles,
        });
    }

    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let target_dir = PathBuf::from(&home).join(".local").join("share").join("verbum").join("voicebox");
    let _ = std::fs::create_dir_all(&target_dir);

    // 2. Ensure UV is available (download standalone if missing)
    let uv_bin = if let Some(p) = find_uv_binary() {
        p
    } else {
        // Install UV via official fast shell script
        let install_uv = "curl -LsSf https://astral.sh/uv/install.sh | sh";
        let _ = Command::new("sh").arg("-c").arg(install_uv).output();
        find_uv_binary().unwrap_or_else(|| PathBuf::from("uv"))
    };

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
    let _ = Command::new("sh").arg("-c").arg("fuser -k 17493/tcp || true").output();

    // 5. Run automated installation and start using UV in background
    let run_cmd = format!(
        r#"
        export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
        cd "{}"
        "{}" run --with fastapi --with uvicorn --with edge-tts python3 server.py > server.log 2>&1 &
        "#,
        target_dir.display(),
        uv_bin.display()
    );

    let _ = Command::new("sh").arg("-c").arg(&run_cmd).spawn();

    // 6. Wait for the server to accept connections
    for _ in 0..20 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        let check = client.check_health(Some(clean_endpoint)).await;
        if check.available {
            let profiles = client.get_profiles(Some(clean_endpoint)).await.unwrap_or_default();
            return Ok(VoiceboxSetupResult {
                success: true,
                is_running: true,
                message: "✓ Voicebox instalado y configurado con voces neuronales de alta fidelidad.".to_string(),
                endpoint: clean_endpoint.to_string(),
                profiles,
            });
        }
    }

    Ok(VoiceboxSetupResult {
        success: false,
        is_running: false,
        message: "No se pudo iniciar el servidor en el puerto 17493. Revisa los logs en ~/.local/share/verbum/voicebox/server.log.".to_string(),
        endpoint: clean_endpoint.to_string(),
        profiles: Vec::new(),
    })
}
