use crate::ai::prompt_builder::{build_system_prompt, build_user_prompt};
use crate::ai::types::{
    AIConnectionStatus, AIProviderConfig, InterpretiveNote, RelatedPassage, SelectionContext,
    StudyDepth, StudyExegesisResult,
};
use serde_json::Value;
use std::time::Instant;

pub async fn execute_exegesis(
    ctx: &SelectionContext,
    depth: &StudyDepth,
    config: &AIProviderConfig,
) -> Result<StudyExegesisResult, String> {
    let api_key = config.api_key.as_deref().unwrap_or("").trim();
    let base_url = config.base_url.as_deref().unwrap_or("").trim();

    let is_gemini = config.provider_type == "gemini"
        || api_key.starts_with("AIzaSy")
        || base_url.contains("generativelanguage.googleapis.com")
        || config.model_name.to_lowercase().contains("gemini");

    match config.provider_type.as_str() {
        "gemini" => {
            match execute_gemini(ctx, depth, config).await {
                Ok(raw_json) => {
                    match sanitize_and_build_result(ctx, depth, &raw_json, "Google AI Studio (Gemini)", &config.model_name) {
                        Ok(res) => Ok(res),
                        Err(parse_err) => {
                            eprintln!("JSON parsing failed: {}, building fallback from raw text", parse_err);
                            Ok(build_fallback_from_raw_text(ctx, depth, &raw_json, "Google AI Studio (Gemini)", &config.model_name))
                        }
                    }
                }
                Err(err) => {
                    eprintln!("Gemini execution failed, falling back to heuristic: {}", err);
                    Ok(build_heuristic_result(ctx, depth, Some(&err)))
                }
            }
        }
        "ollama" => {
            match execute_ollama(ctx, depth, config).await {
                Ok(raw_json) => {
                    match sanitize_and_build_result(ctx, depth, &raw_json, "Ollama Local", &config.model_name) {
                        Ok(res) => Ok(res),
                        Err(parse_err) => {
                            eprintln!("JSON parsing failed: {}, building fallback from raw text", parse_err);
                            Ok(build_fallback_from_raw_text(ctx, depth, &raw_json, "Ollama Local", &config.model_name))
                        }
                    }
                }
                Err(err) => {
                    eprintln!("Ollama execution failed, falling back to heuristic: {}", err);
                    Ok(build_heuristic_result(ctx, depth, Some(&err)))
                }
            }
        }
        "openai_compatible" => {
            if is_gemini {
                match execute_gemini(ctx, depth, config).await {
                    Ok(raw_json) => {
                        match sanitize_and_build_result(ctx, depth, &raw_json, "Google AI Studio (Gemini)", &config.model_name) {
                            Ok(res) => Ok(res),
                            Err(parse_err) => {
                                eprintln!("JSON parsing failed: {}, building fallback from raw text", parse_err);
                                Ok(build_fallback_from_raw_text(ctx, depth, &raw_json, "Google AI Studio (Gemini)", &config.model_name))
                            }
                        }
                    }
                    Err(gemini_err) => {
                        eprintln!("Native Gemini call failed ({}), trying OpenAI-compatible endpoint...", gemini_err);
                        match execute_openai_compatible(ctx, depth, config).await {
                            Ok(raw_json) => {
                                match sanitize_and_build_result(ctx, depth, &raw_json, "Google Gemini (OpenAI API)", &config.model_name) {
                                    Ok(res) => Ok(res),
                                    Err(_) => Ok(build_fallback_from_raw_text(ctx, depth, &raw_json, "Google Gemini (OpenAI API)", &config.model_name))
                                }
                            }
                            Err(openai_err) => {
                                eprintln!("OpenAI-compatible Gemini execution failed: {}", openai_err);
                                Ok(build_heuristic_result(ctx, depth, Some(&format!("Gemini: {} / {}", gemini_err, openai_err))))
                            }
                        }
                    }
                }
            } else {
                match execute_openai_compatible(ctx, depth, config).await {
                    Ok(raw_json) => {
                        match sanitize_and_build_result(ctx, depth, &raw_json, "Cloud API", &config.model_name) {
                            Ok(res) => Ok(res),
                            Err(parse_err) => {
                                eprintln!("JSON parsing failed: {}, building fallback from raw text", parse_err);
                                Ok(build_fallback_from_raw_text(ctx, depth, &raw_json, "Cloud API", &config.model_name))
                            }
                        }
                    }
                    Err(err) => {
                        eprintln!("OpenAI compatible execution failed, falling back to heuristic: {}", err);
                        Ok(build_heuristic_result(ctx, depth, Some(&err)))
                    }
                }
            }
        }
        _ => Ok(build_heuristic_result(ctx, depth, None)),
    }
}

async fn execute_gemini(
    ctx: &SelectionContext,
    depth: &StudyDepth,
    config: &AIProviderConfig,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    let api_key = config.api_key.as_deref().unwrap_or("").trim();
    if api_key.is_empty() {
        return Err("API Key de Google AI Studio (Gemini) no configurada".to_string());
    }

    let raw_model = config.model_name.trim();
    let model = if raw_model.is_empty() {
        "gemini-3.7-flash"
    } else {
        raw_model
    };

    let media_ids: Vec<String> = ctx.available_media.iter().map(|m| m.id.clone()).collect();
    let sys_prompt = build_system_prompt(depth, &media_ids);
    let usr_prompt = build_user_prompt(ctx, depth);

    let endpoint = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let body = serde_json::json!({
        "systemInstruction": {
            "parts": [{ "text": sys_prompt }]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{ "text": usr_prompt }]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": if depth == &StudyDepth::Quick { 1500 } else { 3500 }
        }
    });

    let mut resp = client
        .post(&endpoint)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Error conectando a Gemini API: {}", e))?;

    // If 404 model not found, try available fallbacks automatically
    if resp.status() == reqwest::StatusCode::NOT_FOUND && model != "gemini-2.0-flash" {
        eprintln!("Model {} returned 404, testing fallback...", model);
        let fb_endpoint = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
            api_key
        );
        if let Ok(fb_resp) = client.post(&fb_endpoint).header("Content-Type", "application/json").json(&body).send().await {
            if fb_resp.status().is_success() {
                resp = fb_resp;
            }
        }
    }

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("Error en respuesta de Gemini (Status {}): {}", status, err_text));
    }

    let json_resp: Value = resp.json().await.map_err(|e| format!("Error procesando respuesta JSON de Gemini: {}", e))?;

    if let Some(candidates) = json_resp["candidates"].as_array() {
        if let Some(first) = candidates.first() {
            if let Some(parts) = first["content"]["parts"].as_array() {
                if let Some(first_part) = parts.first() {
                    if let Some(text) = first_part["text"].as_str() {
                        return Ok(text.to_string());
                    }
                }
            }
        }
    }

    if let Some(err) = json_resp["error"]["message"].as_str() {
        return Err(format!("Google AI Studio: {}", err));
    }

    Err(format!("Respuesta inesperada de Gemini: {:?}", json_resp))
}

async fn execute_ollama(
    ctx: &SelectionContext,
    depth: &StudyDepth,
    config: &AIProviderConfig,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    let media_ids: Vec<String> = ctx.available_media.iter().map(|m| m.id.clone()).collect();
    let sys_prompt = build_system_prompt(depth, &media_ids);
    let usr_prompt = build_user_prompt(ctx, depth);

    let raw_endpoint = config.ollama_endpoint.trim();
    let base_endpoint = if raw_endpoint.is_empty() {
        "http://localhost:11434"
    } else {
        raw_endpoint
    }.trim_end_matches('/');

    // Automatically ensure daemon is running
    let _ = crate::ai::ollama_installer::ensure_ollama_daemon_running(base_endpoint).await;

    let endpoint = if base_endpoint.ends_with("/api/chat") {
        base_endpoint.to_string()
    } else {
        format!("{}/api/chat", base_endpoint)
    };

    let body = serde_json::json!({
        "model": config.model_name.trim(),
        "messages": [
            { "role": "system", "content": sys_prompt },
            { "role": "user", "content": usr_prompt }
        ],
        "stream": false,
        "options": {
            "temperature": 0.2,
            "num_predict": if depth == &StudyDepth::Quick { 768 } else { 2048 }
        }
    });

    let resp = client
        .post(&endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("No se pudo conectar a Ollama en {}: {}", endpoint, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("Error en respuesta de Ollama (Status {}): {}", status, err_text));
    }

    let json_resp: Value = resp.json().await.map_err(|e| e.to_string())?;
    let content = json_resp["message"]["content"]
        .as_str()
        .ok_or_else(|| "Ollama no devolvió campo message.content".to_string())?;

    Ok(content.to_string())
}

async fn execute_openai_compatible(
    ctx: &SelectionContext,
    depth: &StudyDepth,
    config: &AIProviderConfig,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    let raw_url = config.base_url.as_deref().unwrap_or("").trim();
    let base_url = if raw_url.is_empty() {
        "https://api.openai.com/v1"
    } else {
        raw_url
    }.trim_end_matches('/');

    let endpoint = if base_url.ends_with("/chat/completions") {
        base_url.to_string()
    } else {
        format!("{}/chat/completions", base_url)
    };

    let api_key = config.api_key.as_deref().unwrap_or("").trim();

    let media_ids: Vec<String> = ctx.available_media.iter().map(|m| m.id.clone()).collect();
    let sys_prompt = build_system_prompt(depth, &media_ids);
    let usr_prompt = build_user_prompt(ctx, depth);

    let body = serde_json::json!({
        "model": config.model_name.trim(),
        "messages": [
            { "role": "system", "content": sys_prompt },
            { "role": "user", "content": usr_prompt }
        ],
        "temperature": 0.2,
        "max_tokens": if depth == &StudyDepth::Quick { 768 } else { 2048 }
    });

    let mut req = client
        .post(&endpoint)
        .header("HTTP-Referer", "https://verbum.bible")
        .header("X-Title", "Verbum Desktop")
        .json(&body);

    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Error conectando a API {}: {}", endpoint, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("Error en respuesta de API (Status {}): {}", status, err_text));
    }

    let json_resp: Value = resp.json().await.map_err(|e| e.to_string())?;
    let content = json_resp["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| "API no devolvió choices[0].message.content".to_string())?;

    Ok(content.to_string())
}

pub fn build_heuristic_result(
    ctx: &SelectionContext,
    depth: &StudyDepth,
    err_msg: Option<&str>,
) -> StudyExegesisResult {
    let title = ctx.selected_text.clone();
    let is_passage = ctx.location.start_verse != ctx.location.end_verse;

    let summary = format!(
        "Evidencia canónica recuperada para «{}» en {} {}, v{}.",
        ctx.selected_text,
        ctx.location.book_name,
        ctx.location.chapter,
        ctx.location.start_verse
    );

    let biblical_context = format!(
        "Texto fuente ({}) en {}: «{}»",
        ctx.location.book_name,
        ctx.location.testament,
        ctx.primary_text
    );

    let translation_nuance = if !ctx.parallel_translations.is_empty() {
        let mut t_str = String::from("Cotejo de versiones disponibles:\n");
        for t in &ctx.parallel_translations {
            t_str.push_str(&format!("• {}: «{}»\n", t.version_short_name, t.text));
        }
        Some(t_str)
    } else {
        None
    };

    let mut interpretive_notes = Vec::new();

    if let Some(err) = err_msg {
        interpretive_notes.push(InterpretiveNote {
            text: format!("⚠️ Aviso: No se pudo completar la llamada al modelo configurado ({err}). Mostrando evidencia bíblica y textual recopilada localmente."),
            note_type: "observacion_textual".to_string(),
        });
    }

    if !ctx.occurrences.is_empty() {
        interpretive_notes.push(InterpretiveNote {
            text: format!(
                "Se registraron {} coincidencias textuales relevantes en otros libros de la Biblia.",
                ctx.occurrences.len()
            ),
            note_type: "observacion_textual".to_string(),
        });
    }

    if let Some(first_concept) = ctx.matched_concepts.first() {
        interpretive_notes.push(InterpretiveNote {
            text: format!(
                "Registro conceptual complementario: {} (Strong: {}). {}",
                first_concept.term_es,
                first_concept.strongs_code.as_deref().unwrap_or("N/A"),
                first_concept.summary
            ),
            note_type: "observacion_textual".to_string(),
        });
    }

    let mut related_passages = Vec::new();
    for occ in &ctx.occurrences {
        related_passages.push(RelatedPassage {
            book_name: occ.book_name.clone(),
            chapter: occ.chapter,
            verse: occ.verse,
            quote: Some(occ.text_snippet.clone()),
        });
    }

    let depth_str = match depth {
        StudyDepth::Quick => "quick",
        StudyDepth::Deep => "deep",
    };

    StudyExegesisResult {
        title,
        selection_type: if is_passage { "pasaje" } else { "termino" }.to_string(),
        depth: depth_str.to_string(),
        is_heuristic_offline: true,
        summary,
        biblical_context,
        historical_cultural_context: None,
        linguistic_context: None,
        interpretive_notes,
        translation_nuance,
        related_passages,
        recommended_media: Vec::new(),
        images: ctx.available_images.clone(),
        provider_used: if err_msg.is_some() { "Fallback Local (Error de Conexión)".to_string() } else { "Datos Locales (Sin IA)".to_string() },
        model_used: "SQLite Canónico".to_string(),
    }
}

fn build_fallback_from_raw_text(
    ctx: &SelectionContext,
    depth: &StudyDepth,
    raw_text: &str,
    provider_name: &str,
    model_name: &str,
) -> StudyExegesisResult {
    let clean_text = raw_text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let depth_str = match depth {
        StudyDepth::Quick => "quick",
        StudyDepth::Deep => "deep",
    };

    StudyExegesisResult {
        title: ctx.selected_text.clone(),
        selection_type: "termino".to_string(),
        depth: depth_str.to_string(),
        is_heuristic_offline: false,
        summary: clean_text.to_string(),
        biblical_context: format!("Texto seleccionado en {} {}:{}: «{}»", ctx.location.book_name, ctx.location.chapter, ctx.location.start_verse, ctx.primary_text),
        historical_cultural_context: None,
        linguistic_context: None,
        interpretive_notes: vec![InterpretiveNote {
            text: "Exégesis generada por el modelo de IA.".to_string(),
            note_type: "observacion_textual".to_string(),
        }],
        translation_nuance: None,
        related_passages: Vec::new(),
        recommended_media: Vec::new(),
        images: ctx.available_images.clone(),
        provider_used: provider_name.to_string(),
        model_used: model_name.to_string(),
    }
}

fn sanitize_and_build_result(
    ctx: &SelectionContext,
    depth: &StudyDepth,
    raw_json: &str,
    provider_name: &str,
    model_name: &str,
) -> Result<StudyExegesisResult, String> {
    // 1. Strip markdown fences if present (```json ... ```)
    let trimmed = raw_json.trim();
    let without_fences = if trimmed.starts_with("```") {
        let lines: Vec<&str> = trimmed.lines().collect();
        let start_idx = if lines.first().map_or(false, |l| l.starts_with("```")) { 1 } else { 0 };
        let end_idx = if lines.last().map_or(false, |l| l.starts_with("```")) { lines.len() - 1 } else { lines.len() };
        if start_idx < end_idx {
            lines[start_idx..end_idx].join("\n")
        } else {
            trimmed.to_string()
        }
    } else {
        trimmed.to_string()
    };

    // 2. Extract JSON object substring
    let clean_json = if let Some(start) = without_fences.find('{') {
        if let Some(end) = without_fences.rfind('}') {
            &without_fences[start..=end]
        } else {
            &without_fences
        }
    } else {
        &without_fences
    };

    let parsed: Value = serde_json::from_str(clean_json)
        .map_err(|e| format!("Error al analizar JSON ({}) del texto: {}", e, clean_json))?;

    let title = parsed["title"]
        .as_str()
        .unwrap_or(&ctx.selected_text)
        .to_string();

    let subject_type = parsed["subject_type"]
        .as_str()
        .unwrap_or("termino")
        .to_string();

    let summary = parsed["summary"]
        .as_str()
        .unwrap_or("Sin resumen disponible.")
        .to_string();

    let biblical_context = parsed["biblical_context"]
        .as_str()
        .unwrap_or("Sin contexto bíblico proporcionado.")
        .to_string();

    let historical_cultural_context = parsed["historical_cultural_context"]
        .as_str()
        .map(|s| s.to_string());

    let linguistic_context = parsed["linguistic_context"]
        .as_str()
        .map(|s| s.to_string());

    let translation_nuance = parsed["translation_nuance"]
        .as_str()
        .map(|s| s.to_string());

    let mut interpretive_notes = Vec::new();
    if let Some(notes_arr) = parsed["interpretive_notes"].as_array() {
        for n in notes_arr {
            if let Some(text) = n["text"].as_str() {
                let note_type = n["note_type"]
                    .as_str()
                    .unwrap_or("observacion_textual")
                    .to_string();
                interpretive_notes.push(InterpretiveNote {
                    text: text.to_string(),
                    note_type,
                });
            }
        }
    }

    let mut related_passages = Vec::new();
    if let Some(passages_arr) = parsed["related_passages"].as_array() {
        for p in passages_arr {
            let b_name = p["book_name"].as_str().unwrap_or("").to_string();
            let ch = p["chapter"].as_i64().unwrap_or(1) as i32;
            let v = p["verse"].as_i64().unwrap_or(1) as i32;
            let quote = p["quote"].as_str().map(|s| s.to_string());

            if !b_name.is_empty() {
                related_passages.push(RelatedPassage {
                    book_name: b_name,
                    chapter: ch,
                    verse: v,
                    quote,
                });
            }
        }
    }

    let valid_media_ids: Vec<String> = ctx.available_media.iter().map(|m| m.id.clone()).collect();
    let mut validated_media = Vec::new();

    if let Some(media_arr) = parsed["recommended_media"].as_array() {
        for m in media_arr {
            if let Some(m_id) = m.as_str() {
                if valid_media_ids.contains(&m_id.to_string()) {
                    validated_media.push(m_id.to_string());
                }
            }
        }
    }

    let depth_str = match depth {
        StudyDepth::Quick => "quick",
        StudyDepth::Deep => "deep",
    };

    let images = if !validated_media.is_empty() {
        ctx.available_images
            .iter()
            .filter(|img| validated_media.contains(&img.id.to_string()))
            .cloned()
            .collect()
    } else {
        ctx.available_images.clone()
    };

    Ok(StudyExegesisResult {
        title,
        selection_type: subject_type,
        depth: depth_str.to_string(),
        is_heuristic_offline: false,
        summary,
        biblical_context,
        historical_cultural_context,
        linguistic_context,
        interpretive_notes,
        translation_nuance,
        related_passages,
        recommended_media: validated_media,
        images,
        provider_used: provider_name.to_string(),
        model_used: model_name.to_string(),
    })
}

pub async fn ping_ai_provider(config: &AIProviderConfig) -> AIConnectionStatus {
    let start = Instant::now();
    let api_key = config.api_key.as_deref().unwrap_or("").trim();
    let base_url = config.base_url.as_deref().unwrap_or("").trim();

    let is_gemini = config.provider_type == "gemini"
        || api_key.starts_with("AIzaSy")
        || base_url.contains("generativelanguage.googleapis.com")
        || config.model_name.to_lowercase().contains("gemini");

    match config.provider_type.as_str() {
        "gemini" => ping_gemini(config, start).await,
        "ollama" => ping_ollama(config, start).await,
        "openai_compatible" => {
            if is_gemini {
                ping_gemini(config, start).await
            } else {
                ping_openai_compatible(config, start).await
            }
        }
        _ => AIConnectionStatus {
            is_connected: true,
            provider_type: "heuristic_offline".to_string(),
            model_name: "SQLite Canónico".to_string(),
            message: "✓ Motor Heurístico Local Offline activo (100% independiente de red y LLM).".to_string(),
            latency_ms: Some(0),
        },
    }
}

async fn ping_gemini(config: &AIProviderConfig, start: Instant) -> AIConnectionStatus {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return AIConnectionStatus {
                is_connected: false,
                provider_type: "gemini".to_string(),
                model_name: config.model_name.clone(),
                message: format!("Error de inicialización HTTP: {}", e),
                latency_ms: None,
            }
        }
    };

    let api_key = config.api_key.as_deref().unwrap_or("").trim();
    if api_key.is_empty() {
        return AIConnectionStatus {
            is_connected: false,
            provider_type: "gemini".to_string(),
            model_name: config.model_name.clone(),
            message: "La API Key de Google AI Studio (Gemini) está vacía. Por favor introduce tu clave de API.".to_string(),
            latency_ms: None,
        };
    }

    let raw_model = config.model_name.trim();
    let model = if raw_model.is_empty() {
        "gemini-3.7-flash"
    } else {
        raw_model
    };

    let endpoint = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let ping_body = serde_json::json!({
        "contents": [
            {
                "role": "user",
                "parts": [{ "text": "ping" }]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 5
        }
    });

    match client.post(&endpoint).json(&ping_body).send().await {
        Ok(resp) if resp.status().is_success() => {
            let latency = start.elapsed().as_millis() as u64;
            AIConnectionStatus {
                is_connected: true,
                provider_type: "gemini".to_string(),
                model_name: model.to_string(),
                message: format!("✓ Conectado exitosamente con Google AI Studio (Modelo: {}).", model),
                latency_ms: Some(latency),
            }
        }
        Ok(resp) => {
            let status = resp.status();
            let err_body = resp.text().await.unwrap_or_default();
            AIConnectionStatus {
                is_connected: false,
                provider_type: "gemini".to_string(),
                model_name: model.to_string(),
                message: format!("Google AI Studio respondió con código {}: {}", status, err_body),
                latency_ms: None,
            }
        }
        Err(err) => {
            AIConnectionStatus {
                is_connected: false,
                provider_type: "gemini".to_string(),
                model_name: model.to_string(),
                message: format!("Error al conectar con Google AI Studio: {}", err),
                latency_ms: None,
            }
        }
    }
}

async fn ping_ollama(config: &AIProviderConfig, start: Instant) -> AIConnectionStatus {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(6))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return AIConnectionStatus {
                is_connected: false,
                provider_type: "ollama".to_string(),
                model_name: config.model_name.clone(),
                message: format!("Error de inicialización de cliente HTTP: {}", e),
                latency_ms: None,
            }
        }
    };

    let raw_endpoint = config.ollama_endpoint.trim();
    let base_endpoint = if raw_endpoint.is_empty() {
        "http://localhost:11434"
    } else {
        raw_endpoint
    }.trim_end_matches('/');

    // Automatically ensure daemon is running
    let _ = crate::ai::ollama_installer::ensure_ollama_daemon_running(base_endpoint).await;

    let endpoint = format!("{}/api/tags", base_endpoint);
    match client.get(&endpoint).send().await {
        Ok(resp) if resp.status().is_success() => {
            let latency = start.elapsed().as_millis() as u64;
            let body: Value = resp.json().await.unwrap_or(serde_json::json!({}));
            let models = body["models"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|m| m["name"].as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .unwrap_or_default();

            AIConnectionStatus {
                is_connected: true,
                provider_type: "ollama".to_string(),
                model_name: config.model_name.clone(),
                message: format!("✓ Conectado a Ollama exitosamente. Modelos disponibles: {}", models),
                latency_ms: Some(latency),
            }
        }
        Ok(resp) => AIConnectionStatus {
            is_connected: false,
            provider_type: "ollama".to_string(),
            model_name: config.model_name.clone(),
            message: format!("Ollama respondió con código {}", resp.status()),
            latency_ms: None,
        },
        Err(err) => AIConnectionStatus {
            is_connected: false,
            provider_type: "ollama".to_string(),
            model_name: config.model_name.clone(),
            message: format!("No se pudo contactar con Ollama en {}: {}", base_endpoint, err),
            latency_ms: None,
        },
    }
}

async fn ping_openai_compatible(config: &AIProviderConfig, start: Instant) -> AIConnectionStatus {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return AIConnectionStatus {
                is_connected: false,
                provider_type: "openai_compatible".to_string(),
                model_name: config.model_name.clone(),
                message: format!("Error de cliente HTTP: {}", e),
                latency_ms: None,
            }
        }
    };

    let raw_url = config.base_url.as_deref().unwrap_or("").trim();
    let base_url = if raw_url.is_empty() {
        "https://api.openai.com/v1"
    } else {
        raw_url
    }.trim_end_matches('/');

    let endpoint = if base_url.ends_with("/chat/completions") {
        base_url.to_string()
    } else {
        format!("{}/chat/completions", base_url)
    };

    let api_key = config.api_key.as_deref().unwrap_or("").trim();
    if api_key.is_empty() && !base_url.contains("localhost") && !base_url.contains("127.0.0.1") {
        return AIConnectionStatus {
            is_connected: false,
            provider_type: "openai_compatible".to_string(),
            model_name: config.model_name.clone(),
            message: "La API Key está vacía. Por favor introduce tu clave de API.".to_string(),
            latency_ms: None,
        };
    }

    let ping_body = serde_json::json!({
        "model": config.model_name.trim(),
        "messages": [
            { "role": "user", "content": "ping" }
        ],
        "max_tokens": 5
    });

    let mut req = client
        .post(&endpoint)
        .header("HTTP-Referer", "https://verbum.bible")
        .header("X-Title", "Verbum Desktop")
        .json(&ping_body);

    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
    }

    match req.send().await {
        Ok(resp) if resp.status().is_success() => {
            let latency = start.elapsed().as_millis() as u64;
            AIConnectionStatus {
                is_connected: true,
                provider_type: "openai_compatible".to_string(),
                model_name: config.model_name.clone(),
                message: format!("✓ Conectado exitosamente con {} (Modelo: {}).", base_url, config.model_name.trim()),
                latency_ms: Some(latency),
            }
        }
        Ok(resp) => {
            let status = resp.status();
            let err_body = resp.text().await.unwrap_or_default();
            AIConnectionStatus {
                is_connected: false,
                provider_type: "openai_compatible".to_string(),
                model_name: config.model_name.clone(),
                message: format!("La API respondió con código {}: {}", status, err_body),
                latency_ms: None,
            }
        }
        Err(err) => {
            AIConnectionStatus {
                is_connected: false,
                provider_type: "openai_compatible".to_string(),
                model_name: config.model_name.clone(),
                message: format!("Error al conectar con {}: {}", endpoint, err),
                latency_ms: None,
            }
        }
    }
}
