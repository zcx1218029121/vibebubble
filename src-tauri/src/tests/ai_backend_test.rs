// AI Backend Trait Tests
use crate::ai_backend::{AIBackend, BackendConfig, create_backend, minimax::MiniMaxBackend, openai::OpenAIBackend, claude::ClaudeBackend, ollama::OllamaBackend};

#[tokio::test]
async fn test_minimax_backend_name() {
    let backend = MiniMaxBackend::new("test-key", "MiniMax-Text-01");
    assert_eq!(backend.name(), "minimax");
}

#[tokio::test]
async fn test_openai_backend_name() {
    let backend = OpenAIBackend::with_base_url("test-key", "", "bearer", "gpt-4o-mini");
    assert_eq!(backend.name(), "openai");
}

#[tokio::test]
async fn test_claude_backend_name() {
    let backend = ClaudeBackend::with_base_url("test-key", "", "api_key", "claude-sonnet-4-20250514");
    assert_eq!(backend.name(), "claude");
}

#[tokio::test]
async fn test_ollama_backend_name() {
    let backend = OllamaBackend::new("http://localhost:11434", "llama3.2");
    assert_eq!(backend.name(), "ollama");
}

#[test]
fn test_create_backend_minimax() {
    let config = BackendConfig::default();
    let backend = create_backend("minimax", &config).unwrap();
    assert_eq!(backend.name(), "minimax");
}

#[test]
fn test_create_backend_openai_requires_key() {
    let config = BackendConfig::default();
    let result = create_backend("openai", &config);
    assert!(result.is_err());
}

#[test]
fn test_create_backend_openai_with_key() {
    let mut config = BackendConfig::default();
    config.openai_api_key = "test-key".to_string();
    let backend = create_backend("openai", &config).unwrap();
    assert_eq!(backend.name(), "openai");
}

#[test]
fn test_create_backend_claude_requires_key() {
    let config = BackendConfig::default();
    let result = create_backend("claude", &config);
    assert!(result.is_err());
}

#[test]
fn test_create_backend_ollama() {
    let config = BackendConfig::default();
    let backend = create_backend("ollama", &config).unwrap();
    assert_eq!(backend.name(), "ollama");
}

#[test]
fn test_create_backend_unknown() {
    let config = BackendConfig::default();
    let result = create_backend("nonexistent", &config);
    assert!(result.is_err());
}
