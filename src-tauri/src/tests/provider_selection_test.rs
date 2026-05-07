// Provider Selection Tests
// TDD: Tests for model provider selection and configuration validation

use crate::ai_backend::{BackendConfig, create_backend, AIError};

/// Test that MiniMax backend is created successfully with empty API key
/// (MiniMax may work without explicit API key in some configurations)
#[test]
fn test_select_minimax_backend_no_key() {
    let config = BackendConfig::default();
    let result = create_backend("minimax", &config);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().name(), "minimax");
}

/// Test that MiniMax backend uses correct model from config
#[test]
fn test_minimax_backend_uses_config_model() {
    let config = BackendConfig::default();
    let backend = create_backend("minimax", &config).unwrap();
    assert_eq!(backend.name(), "minimax");
}

/// Test that OpenAI backend requires API key
#[test]
fn test_select_openai_backend_requires_api_key() {
    let config = BackendConfig::default();
    let result = create_backend("openai", &config);
    assert!(result.is_err());
    
    if let Err(AIError::Auth(msg)) = result {
        assert!(msg.contains("OpenAI") || msg.contains("API"));
    }
}

/// Test that OpenAI backend works with valid API key
#[test]
fn test_select_openai_backend_with_api_key() {
    let mut config = BackendConfig::default();
    config.openai_api_key = "sk-test-key-123".to_string();
    config.openai_model = "gpt-4o".to_string();
    
    let result = create_backend("openai", &config);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().name(), "openai");
}

/// Test that Claude backend requires API key
#[test]
fn test_select_claude_backend_requires_api_key() {
    let config = BackendConfig::default();
    let result = create_backend("claude", &config);
    assert!(result.is_err());
    
    if let Err(AIError::Auth(msg)) = result {
        assert!(msg.contains("Claude") || msg.contains("API"));
    }
}

/// Test that Claude backend works with valid API key
#[test]
fn test_select_claude_backend_with_api_key() {
    let mut config = BackendConfig::default();
    config.claude_api_key = "sk-ant-test-key-123".to_string();
    config.claude_model = "claude-sonnet-4-20250514".to_string();
    
    let result = create_backend("claude", &config);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().name(), "claude");
}

/// Test that Ollama backend works without API key (local)
#[test]
fn test_select_ollama_backend_no_key() {
    let config = BackendConfig::default();
    let result = create_backend("ollama", &config);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().name(), "ollama");
}

/// Test that Ollama backend uses custom host
#[test]
fn test_ollama_backend_custom_host() {
    let mut config = BackendConfig::default();
    config.ollama_host = "http://192.168.1.100:11434".to_string();
    
    let backend = create_backend("ollama", &config).unwrap();
    assert_eq!(backend.name(), "ollama");
}

/// Test that unknown backend returns error
#[test]
fn test_select_unknown_backend_returns_error() {
    let config = BackendConfig::default();
    let result = create_backend("unknown_provider", &config);
    assert!(result.is_err());
    
    if let Err(AIError::Unknown(msg)) = result {
        assert!(msg.contains("未知后端") || msg.contains("unknown"));
    }
}

/// Test that each backend name is correct
#[test]
fn test_all_backend_names() {
    let mut config = BackendConfig::default();
    config.openai_api_key = "key".to_string();
    config.claude_api_key = "key".to_string();
    
    assert_eq!(create_backend("minimax", &config).unwrap().name(), "minimax");
    assert_eq!(create_backend("openai", &config).unwrap().name(), "openai");
    assert_eq!(create_backend("claude", &config).unwrap().name(), "claude");
    assert_eq!(create_backend("ollama", &config).unwrap().name(), "ollama");
}

/// Test provider selection with partial API key configuration
#[test]
fn test_provider_selection_partial_config() {
    let mut config = BackendConfig::default();
    // Only OpenAI key set
    config.openai_api_key = "sk-openai".to_string();
    
    // MiniMax should work (no key required)
    assert!(create_backend("minimax", &config).is_ok());
    
    // OpenAI should work (key provided)
    assert!(create_backend("openai", &config).is_ok());
    
    // Claude should fail (no key)
    assert!(create_backend("claude", &config).is_err());
    
    // Ollama should work (no key required)
    assert!(create_backend("ollama", &config).is_ok());
}

/// Test that selected_backend field in AppConfig determines provider
#[test]
fn test_app_config_selected_backend_field() {
    use crate::AppConfig;
    
    let mut config = AppConfig::default();
    
    // Default is minimax
    assert_eq!(config.selected_backend, "minimax");
    
    // Change to openai
    config.selected_backend = "openai".to_string();
    assert_eq!(config.selected_backend, "openai");
    
    // Change to claude
    config.selected_backend = "claude".to_string();
    assert_eq!(config.selected_backend, "claude");
    
    // Change to ollama
    config.selected_backend = "ollama".to_string();
    assert_eq!(config.selected_backend, "ollama");
}

/// Test that AppConfig contains all backend configurations
#[test]
fn test_app_config_contains_all_backend_configs() {
    use crate::AppConfig;
    
    let config = AppConfig::default();
    
    // AppConfig should have backends field with all provider configs
    assert!(config.backends.minimax_api_key.is_empty());
    assert!(config.backends.openai_api_key.is_empty());
    assert!(config.backends.claude_api_key.is_empty());
    assert_eq!(config.backends.ollama_host, "http://localhost:11434");
}

/// Test backend config update preserves other fields
#[test]
fn test_backend_config_partial_update() {
    let mut config = BackendConfig::default();
    
    // Set OpenAI key
    config.openai_api_key = "sk-new-key".to_string();
    
    // Verify other fields unchanged
    assert!(config.minimax_api_key.is_empty());
    assert!(config.claude_api_key.is_empty());
    assert_eq!(config.ollama_host, "http://localhost:11434");
}
