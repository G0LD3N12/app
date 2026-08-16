pub mod context_retrieval;
pub mod ollama_installer;
pub mod prompt_builder;
pub mod providers;
pub mod types;

use crate::db::DatabaseManager;
pub use types::*;

pub async fn analyze_selection(
    db: &DatabaseManager,
    req: &SelectionStudyRequest,
    config: &AIProviderConfig,
) -> Result<StudyExegesisResult, String> {
    // 1. Compile adaptive SelectionContext
    let ctx = context_retrieval::build_selection_context(db, req)?;

    // 2. Execute via configured provider with validation and fallback
    providers::execute_exegesis(&ctx, &req.depth, config).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn get_test_db() -> DatabaseManager {
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let res_dir = manifest_dir.join("resources");
        DatabaseManager::new(res_dir).expect("Failed to open test database")
    }

    #[tokio::test]
    async fn test_analyze_selection_apacienta_mis_ovejas() {
        let db = get_test_db();
        let req = SelectionStudyRequest {
            selected_text: "Apacienta mis ovejas".to_string(),
            version_id: "rv1909".to_string(),
            book_id: 43, // Juan
            book_name: "Juan".to_string(),
            chapter: 21,
            start_verse: 17,
            end_verse: 17,
            depth: StudyDepth::Quick,
        };
        let cfg = AIProviderConfig {
            provider_type: "heuristic_offline".to_string(),
            ollama_endpoint: "http://localhost:11434".to_string(),
            model_name: "gemini-3.7-flash".to_string(),
            api_key: None,
            base_url: None,
            confirm_before_send: false,
            local_only_privacy: true,
        };

        let result = analyze_selection(&db, &req, &cfg).await;
        assert!(result.is_ok(), "analyze_selection failed for 'Apacienta mis ovejas': {:?}", result.err());
        let exegesis = result.unwrap();
        assert_eq!(exegesis.title, "Apacienta mis ovejas");
        assert!(!exegesis.summary.is_empty());
        assert!(!exegesis.biblical_context.is_empty());
        assert!(exegesis.biblical_context.contains("Juan"));
        println!("\n=== TEST APODERADO: Apacienta mis ovejas (Juan 21:17) ===");
        println!("Title: {}", exegesis.title);
        println!("Summary: {}", exegesis.summary);
        println!("Biblical context: {}", exegesis.biblical_context);
        println!("Interpretive Notes count: {}", exegesis.interpretive_notes.len());
        println!("Related Passages count: {}", exegesis.related_passages.len());
    }

    #[tokio::test]
    async fn test_analyze_selection_la_cumbre_del_monte() {
        let db = get_test_db();
        let req = SelectionStudyRequest {
            selected_text: "la cumbre del monte".to_string(),
            version_id: "rv1909".to_string(),
            book_id: 6, // Josué
            book_name: "Josué".to_string(),
            chapter: 15,
            start_verse: 8,
            end_verse: 8,
            depth: StudyDepth::Deep,
        };
        let cfg = AIProviderConfig {
            provider_type: "heuristic_offline".to_string(),
            ollama_endpoint: "http://localhost:11434".to_string(),
            model_name: "gemini-3.7-flash".to_string(),
            api_key: None,
            base_url: None,
            confirm_before_send: false,
            local_only_privacy: true,
        };

        let result = analyze_selection(&db, &req, &cfg).await;
        assert!(result.is_ok());
        let exegesis = result.unwrap();
        assert_eq!(exegesis.title, "la cumbre del monte");
        assert_eq!(exegesis.depth, "deep");
        assert!(exegesis.related_passages.len() >= 1);
        println!("\n=== TEST APODERADO: la cumbre del monte (Josué 15:8) ===");
        println!("Title: {}", exegesis.title);
        println!("Summary: {}", exegesis.summary);
        println!("Related passages found: {}", exegesis.related_passages.len());
        for p in &exegesis.related_passages {
            println!("  - {} {}:{} -> {:?}", p.book_name, p.chapter, p.verse, p.quote);
        }
    }

    #[tokio::test]
    async fn test_analyze_selection_israel() {
        let db = get_test_db();
        let req = SelectionStudyRequest {
            selected_text: "Israel".to_string(),
            version_id: "rv1909".to_string(),
            book_id: 9, // 1 Samuel
            book_name: "1 Samuel".to_string(),
            chapter: 11,
            start_verse: 13,
            end_verse: 13,
            depth: StudyDepth::Quick,
        };
        let cfg = AIProviderConfig {
            provider_type: "heuristic_offline".to_string(),
            ollama_endpoint: "http://localhost:11434".to_string(),
            model_name: "gemini-3.7-flash".to_string(),
            api_key: None,
            base_url: None,
            confirm_before_send: false,
            local_only_privacy: true,
        };

        let result = analyze_selection(&db, &req, &cfg).await;
        assert!(result.is_ok());
        let exegesis = result.unwrap();
        assert_eq!(exegesis.title, "Israel");
        assert!(exegesis.related_passages.len() >= 3);
        println!("\n=== TEST APODERADO: Israel (1 Samuel 11:13) ===");
        println!("Title: {}", exegesis.title);
        println!("Summary: {}", exegesis.summary);
        println!("Related passages found: {}", exegesis.related_passages.len());
    }

    #[tokio::test]
    #[ignore = "requires local Ollama daemon"]
    async fn test_ollama_local_status_check() {
        let status = ollama_installer::check_ollama_status("http://localhost:11434", "qwen3:4b-instruct-2507").await;
        println!("\n=== TEST OLLAMA STATUS CHECK ===");
        println!("Running: {}", status.is_ollama_running);
        println!("Model installed: {}", status.is_model_installed);
        println!("Installed models: {:?}", status.installed_models);
        println!("Message: {}", status.message);
        assert!(status.is_ollama_running, "Ollama daemon should be running");
        assert!(status.is_model_installed, "Target model should be marked as installed");
    }
}
