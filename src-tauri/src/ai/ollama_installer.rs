use crate::ai::types::OllamaModelInstallStatus;
use serde_json::Value;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

pub fn find_ollama_binary() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(home) = std::env::var("HOME") {
        candidates.push(PathBuf::from(&home).join(".local").join("bin").join("ollama"));
    }
    candidates.push(PathBuf::from("/usr/local/bin/ollama"));
    candidates.push(PathBuf::from("/usr/bin/ollama"));
    candidates.push(PathBuf::from("ollama"));

    for c in &candidates {
        if c == &PathBuf::from("ollama") {
            if let Ok(o) = Command::new("ollama").arg("--version").output() {
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

pub async fn ensure_ollama_daemon_running(endpoint: &str) -> Result<(), String> {
    let clean_endpoint = if endpoint.trim().is_empty() {
        "http://localhost:11434"
    } else {
        endpoint.trim().trim_end_matches('/')
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let tags_url = format!("{}/api/tags", clean_endpoint);
    if client.get(&tags_url).send().await.map(|r| r.status().is_success()).unwrap_or(false) {
        return Ok(());
    }

    // 1. Locate or install Ollama binary
    let bin_path = if let Some(p) = find_ollama_binary() {
        p
    } else {
        // Automatically install Ollama standalone binary into ~/.local/bin
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let local_dir = PathBuf::from(&home).join(".local");
        let _ = std::fs::create_dir_all(local_dir.join("bin"));

        // Download and extract
        let install_cmd = format!(
            "curl -fSL https://github.com/ollama/ollama/releases/download/v0.32.9/ollama-linux-amd64.tar.zst -o /tmp/ollama.tar.zst && tar --zstd -xf /tmp/ollama.tar.zst -C {} && rm -f /tmp/ollama.tar.zst && chmod +x {}/bin/ollama",
            local_dir.display(),
            local_dir.display()
        );

        let _ = Command::new("sh")
            .arg("-c")
            .arg(&install_cmd)
            .output();

        if let Some(p) = find_ollama_binary() {
            p
        } else {
            return Err("No se pudo localizar ni descargar automáticamente el binario de Ollama.".to_string());
        }
    };

    // 2. Spawn ollama serve in background
    let _ = Command::new(&bin_path)
        .arg("serve")
        .spawn();

    // 3. Wait up to 6 seconds for the daemon to start accepting connections
    for _ in 0..12 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if client.get(&tags_url).send().await.map(|r| r.status().is_success()).unwrap_or(false) {
            return Ok(());
        }
    }

    Err("Ollama se inició pero el endpoint http://localhost:11434 no respondió a tiempo.".to_string())
}

pub async fn check_ollama_status(endpoint: &str, target_model: &str) -> OllamaModelInstallStatus {
    let clean_endpoint = if endpoint.trim().is_empty() {
        "http://localhost:11434"
    } else {
        endpoint.trim().trim_end_matches('/')
    };

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return OllamaModelInstallStatus {
                is_ollama_running: false,
                is_model_installed: false,
                model_name: target_model.to_string(),
                installed_models: Vec::new(),
                message: format!("Error inicializando cliente HTTP: {}", e),
                progress_percent: None,
            };
        }
    };

    let tags_url = format!("{}/api/tags", clean_endpoint);
    match client.get(&tags_url).send().await {
        Ok(resp) if resp.status().is_success() => {
            let body: Value = resp.json().await.unwrap_or(serde_json::json!({}));
            let models: Vec<String> = body["models"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();

            let target_clean = target_model.trim().to_lowercase();
            let base_name = target_clean.split(':').next().unwrap_or(&target_clean);

            let is_installed = models.iter().any(|m| {
                let m_clean = m.to_lowercase();
                m_clean == target_clean
                    || m_clean.starts_with(&format!("{}:", target_clean))
                    || m_clean.contains(base_name)
            });

            if is_installed {
                OllamaModelInstallStatus {
                    is_ollama_running: true,
                    is_model_installed: true,
                    model_name: target_model.to_string(),
                    installed_models: models,
                    message: format!("✓ Modelo «{}» listo para trabajar localmente.", target_model),
                    progress_percent: Some(100.0),
                }
            } else {
                OllamaModelInstallStatus {
                    is_ollama_running: true,
                    is_model_installed: false,
                    model_name: target_model.to_string(),
                    installed_models: models,
                    message: format!("Ollama está activo pero el modelo «{}» aún no ha sido descargado.", target_model),
                    progress_percent: Some(0.0),
                }
            }
        }
        _ => {
            let has_binary = find_ollama_binary().is_some();
            OllamaModelInstallStatus {
                is_ollama_running: false,
                is_model_installed: false,
                model_name: target_model.to_string(),
                installed_models: Vec::new(),
                message: if has_binary {
                    "Ollama está instalado pero el servicio en segundo plano está detenido.".to_string()
                } else {
                    "Ollama no está en ejecución. Pulsa «Instalar» para configurar todo automáticamente.".to_string()
                },
                progress_percent: None,
            }
        }
    }
}

pub async fn install_or_pull_model(endpoint: &str, target_model: &str) -> Result<OllamaModelInstallStatus, String> {
    let clean_endpoint = if endpoint.trim().is_empty() {
        "http://localhost:11434"
    } else {
        endpoint.trim().trim_end_matches('/')
    };

    // 1. Ensure Ollama daemon is running
    ensure_ollama_daemon_running(clean_endpoint).await?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(600)) // 10 minutes timeout for model download
        .build()
        .map_err(|e| e.to_string())?;

    // 2. Request model pull
    let pull_url = format!("{}/api/pull", clean_endpoint);
    let model_to_pull = if target_model.trim().is_empty() {
        "qwen2.5:3b"
    } else {
        target_model.trim()
    };

    let pull_body = serde_json::json!({
        "name": model_to_pull,
        "stream": false
    });

    let resp = client
        .post(&pull_url)
        .json(&pull_body)
        .send()
        .await
        .map_err(|e| format!("Error en conexión con el servicio de descarga de Ollama: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        // If the specific requested tag was not found in registry (e.g. qwen3:4b-instruct-2507 vs qwen2.5:3b), fallback to official registry tag
        if model_to_pull.contains("qwen") {
            let fallback_model = "qwen2.5:3b";
            let fallback_body = serde_json::json!({
                "name": fallback_model,
                "stream": false
            });
            let fb_resp = client.post(&pull_url).json(&fallback_body).send().await
                .map_err(|e| format!("Error descargando alternativa de Qwen: {}", e))?;

            if fb_resp.status().is_success() {
                return Ok(OllamaModelInstallStatus {
                    is_ollama_running: true,
                    is_model_installed: true,
                    model_name: fallback_model.to_string(),
                    installed_models: vec![fallback_model.to_string()],
                    message: format!("✓ Modelo local «{}» descargado y listo para trabajar.", fallback_model),
                    progress_percent: Some(100.0),
                });
            }
        }
        return Err(format!("Error en descarga de modelo en Ollama (HTTP {}): {}", status, err_text));
    }

    // 3. Confirm and return updated status
    let status = check_ollama_status(clean_endpoint, model_to_pull).await;
    Ok(status)
}
