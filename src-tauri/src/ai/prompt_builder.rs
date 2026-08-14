use crate::ai::types::{SelectionContext, StudyDepth};

pub fn build_system_prompt(depth: &StudyDepth, available_media_ids: &[String]) -> String {
    let media_instruction = if available_media_ids.is_empty() {
        "No hay medios disponibles. El campo \"recommended_media\" DEBE ser una lista vacía [].".to_string()
    } else {
        format!(
            "Medios disponibles verificados en Verbum: {:?}. En \"recommended_media\" solo puedes incluir IDs que estén en esta lista exacta.",
            available_media_ids
        )
    };

    let depth_instruction = match depth {
        StudyDepth::Quick => {
            "MODO ESTUDIO RÁPIDO (DRAWER):
- Resumen conciso y sustancioso (60 a 120 palabras).
- Contexto bíblico directo en 2-3 oraciones claras.
- Contexto histórico o cultural solo si es relevante.
- Notas interpretativas: 1 o 2 observaciones clave diferenciando 'observacion_textual' o 'inferencia_teologica'."
        }
        StudyDepth::Deep => {
            "MODO ESTUDIO PROFUNDIZADO (PÁGINA COMPLETA):
- Exégesis académica y teológica exhaustiva (600 a 900 palabras).
- Desarrollo histórico, arqueológico y cultural del Antiguo Oriente Próximo o época grecorromana.
- Análisis de tipología canónica, conexiones intertextuales y matices de traducción.
- Notas interpretativas detalladas categorizadas por 'observacion_textual', 'inferencia_teologica' o 'tradicion_interpretativa'."
        }
    };

    format!(
        r#"Eres el motor de exégesis y estudio bíblico contextual de Verbum Desktop.
Tu misión es analizar la selección textual del usuario utilizando estrictamente el expediente de contexto y evidencia bíblica proporcionado.

REGLAS ACADÉMICAS OBLIGATORIAS:
1. DISTINGUE DATO DE INTERPRETACIÓN: No presentes tradiciones teológicas secundarias como si fueran afirmaciones explícitas del texto bíblico. Usa el arreglo "interpretive_notes" para inferencias o tradiciones.
2. CERO ALUCINACIONES: No inventes versículos inexistentes, etimologías falsas ni IDs de medios.
3. {media_instruction}
4. {depth_instruction}

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
{{
  "title": "Título conciso del término, frase o pasaje analizado",
  "subject_type": "termino | frase | evento | persona | lugar | pasaje",
  "summary": "Resumen exegético",
  "biblical_context": "Contexto literario, canónico y narrativo inmediato",
  "historical_cultural_context": "Contexto histórico o cultural (o null si no aplica)",
  "linguistic_context": "Nota lingüística o etimológica (o null si no aplica)",
  "interpretive_notes": [
    {{
      "text": "Explicación de la nota",
      "note_type": "observacion_textual | inferencia_teologica | tradicion_interpretativa"
    }}
  ],
  "translation_nuance": "Observación sobre diferencias entre traducciones (o null si no aplica)",
  "related_passages": [
    {{
      "book_name": "Nombre exacto del libro",
      "chapter": 1,
      "verse": 1,
      "quote": "Frase o cita relevante"
    }}
  ],
  "recommended_media": []
}}"#
    )
}

pub fn build_user_prompt(ctx: &SelectionContext, depth: &StudyDepth) -> String {
    let mut prompt = String::new();

    prompt.push_str(&format!(
        "=== EXPEDIENTE CONTEXTUAL DE SELECCIÓN ===\n\n\
        TEXTO SELECCIONADO POR EL USUARIO: «{}»\n\
        UBICACIÓN: {} {}, versículos {}-{} ({})\n\
        VERSÍCULO FUENTE COMPLETO: {}\n\n",
        ctx.selected_text,
        ctx.location.book_name,
        ctx.location.chapter,
        ctx.location.start_verse,
        ctx.location.end_verse,
        ctx.location.testament,
        ctx.primary_text
    ));

    // Surrounding context
    if !ctx.immediate_context.is_empty() {
        prompt.push_str("--- CONTEXTO NARRATIVO INMEDIATO DEL CAPÍTULO ---\n");
        for v in &ctx.immediate_context {
            prompt.push_str(&format!("  [v{}] {}\n", v.verse, v.text));
        }
        prompt.push('\n');
    }

    // Parallel translations
    if !ctx.parallel_translations.is_empty() {
        prompt.push_str("--- COTEJO EN OTRAS TRADUCCIONES OFFLINE ---\n");
        for t in &ctx.parallel_translations {
            prompt.push_str(&format!("  [{}] {}\n", t.version_short_name, t.text));
        }
        prompt.push('\n');
    }

    // Cross-biblical occurrences from FTS5
    if !ctx.occurrences.is_empty() {
        prompt.push_str("--- OCURRENCIAS TEXTUALES RELEVANTES EN LA BIBLIA (FTS5) ---\n");
        for occ in &ctx.occurrences {
            prompt.push_str(&format!(
                "  • {} {}:{} -> {}\n",
                occ.book_name, occ.chapter, occ.verse, occ.text_snippet
            ));
        }
        prompt.push('\n');
    }

    // Matched concepts in knowledge base
    if !ctx.matched_concepts.is_empty() {
        prompt.push_str("--- DATOS COMPLEMENTARIOS DE CONOCIMIENTO (VERBUM DB) ---\n");
        for c in &ctx.matched_concepts {
            prompt.push_str(&format!(
                "  • Concepto: {} | Strong: {} | Resumen: {}\n",
                c.term_es,
                c.strongs_code.as_deref().unwrap_or("N/A"),
                c.summary
            ));
        }
        prompt.push('\n');
    }

    // Available media IDs
    if !ctx.available_media.is_empty() {
        prompt.push_str("--- MEDIOS ARQUEOLÓGICOS / HISTÓRICOS LOCALES DISPONIBLES ---\n");
        for m in &ctx.available_media {
            prompt.push_str(&format!("  • [ID: {}] {} ({})\n", m.id, m.title, m.caption));
        }
        prompt.push('\n');
    }

    match depth {
        StudyDepth::Quick => {
            prompt.push_str("INSTRUCCIÓN: Genera el análisis exegético en modo QUICK_STUDY en formato JSON.");
        }
        StudyDepth::Deep => {
            prompt.push_str("INSTRUCCIÓN: Genera la exégesis profunda y exhaustiva en modo DEEP_STUDY en formato JSON.");
        }
    }

    prompt
}
