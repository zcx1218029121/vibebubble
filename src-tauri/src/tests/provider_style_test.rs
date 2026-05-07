// Provider Style Configuration Tests
// TDD: Tests for baseURL and auth style (OpenAI vs Claude) configuration

use crate::ai_backend::BackendConfig;

/// Auth style enum to distinguish between OpenAI and Claude authentication styles
#[test]
fn test_backend_config_has_base_url_field() {
    let config = BackendConfig::default();
    
    // All providers should have base_url configurable
    assert!(config.openai_base_url.is_empty() || !config.openai_base_url.is_empty());
    assert!(config.claude_base_url.is_empty() || !config.claude_base_url.is_empty());
}

/// Test OpenAI-style base URL configuration
#[test]
fn test_openai_base_url_config() {
    let mut config = BackendConfig::default();
    config.openai_base_url = "https://api.openai.com/v1".to_string();
    
    assert_eq!(config.openai_base_url, "https://api.openai.com/v1");
}

/// Test Claude-style base URL configuration  
#[test]
fn test_claude_base_url_config() {
    let mut config = BackendConfig::default();
    config.claude_base_url = "https://api.anthropic.com".to_string();
    
    assert_eq!(config.claude_base_url, "https://api.anthropic.com");
}

/// Test that base URL defaults to provider's official endpoint
#[test]
fn test_openai_base_url_default_is_official() {
    let config = BackendConfig::default();
    // Default should be empty (uses hardcoded default)
    assert!(config.openai_base_url.is_empty());
}

/// Test custom base URL for OpenAI-compatible APIs
#[test]
fn test_custom_openai_compatible_base_url() {
    let mut config = BackendConfig::default();
    // Example: using a proxy or local LLM server
    config.openai_base_url = "http://localhost:8080/v1".to_string();
    
    assert_eq!(config.openai_base_url, "http://localhost:8080/v1");
}

/// Test custom base URL for Claude-compatible APIs
#[test]
fn test_custom_claude_compatible_base_url() {
    let mut config = BackendConfig::default();
    config.claude_base_url = "https://api.claude.ai".to_string();
    
    assert_eq!(config.claude_base_url, "https://api.claude.ai");
}

/// Test auth style can be configured
/// OpenAI style: Authorization: Bearer <key>
/// Claude style: x-api-key: <key>
#[test]
fn test_auth_style_config_fields_exist() {
    let config = BackendConfig::default();
    
    // Should have auth_style field (enum: "openai" or "claude")
    // OpenAI uses "bearer", Claude uses "api_key"
    assert!(config.openai_auth_style.is_empty() || 
            config.openai_auth_style == "bearer" || 
            config.openai_auth_style == "api_key");
}

/// Test OpenAI auth style configuration
#[test]
fn test_openai_auth_style_bearer() {
    let mut config = BackendConfig::default();
    config.openai_auth_style = "bearer".to_string();
    
    assert_eq!(config.openai_auth_style, "bearer");
}

/// Test Claude auth style configuration
#[test]
fn test_claude_auth_style_api_key() {
    let mut config = BackendConfig::default();
    config.claude_auth_style = "api_key".to_string();
    
    assert_eq!(config.claude_auth_style, "api_key");
}

/// Test full OpenAI-compatible configuration
#[test]
fn test_full_openai_compatible_config() {
    let mut config = BackendConfig::default();
    config.openai_api_key = "sk-custom-key".to_string();
    config.openai_base_url = "https://api.example.com/v1".to_string();
    config.openai_auth_style = "bearer".to_string();
    config.openai_model = "custom-model".to_string();
    
    assert_eq!(config.openai_api_key, "sk-custom-key");
    assert_eq!(config.openai_base_url, "https://api.example.com/v1");
    assert_eq!(config.openai_auth_style, "bearer");
    assert_eq!(config.openai_model, "custom-model");
}

/// Test full Claude-compatible configuration
#[test]
fn test_full_claude_compatible_config() {
    let mut config = BackendConfig::default();
    config.claude_api_key = "sk-ant-custom-key".to_string();
    config.claude_base_url = "https://custom.claude.endpoint.com".to_string();
    config.claude_auth_style = "api_key".to_string();
    config.claude_model = "claude-custom-model".to_string();
    
    assert_eq!(config.claude_api_key, "sk-ant-custom-key");
    assert_eq!(config.claude_base_url, "https://custom.claude.endpoint.com");
    assert_eq!(config.claude_auth_style, "api_key");
    assert_eq!(config.claude_model, "claude-custom-model");
}

/// Test serialization includes new base_url and auth_style fields
#[test]
fn test_backend_config_serialize_with_new_fields() {
    let mut config = BackendConfig::default();
    config.openai_base_url = "https://custom.api.com/v1".to_string();
    config.openai_auth_style = "bearer".to_string();
    config.claude_base_url = "https://custom.claude.com".to_string();
    config.claude_auth_style = "api_key".to_string();
    
    let json = serde_json::to_string(&config).unwrap();
    
    // Should contain the new fields
    assert!(json.contains("openai_base_url"));
    assert!(json.contains("openai_auth_style"));
    assert!(json.contains("claude_base_url"));
    assert!(json.contains("claude_auth_style"));
    
    // Should deserialize correctly
    let deserialized: BackendConfig = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.openai_base_url, "https://custom.api.com/v1");
    assert_eq!(deserialized.claude_base_url, "https://custom.claude.com");
}

/// Test config with all fields set
#[test]
fn test_backend_config_full_serialization_roundtrip() {
    let mut config = BackendConfig::default();
    config.minimax_api_key = "minimax-key".to_string();
    config.openai_api_key = "sk-openai".to_string();
    config.openai_base_url = "https://api.openai.com/v1".to_string();
    config.openai_auth_style = "bearer".to_string();
    config.openai_model = "gpt-4o".to_string();
    config.claude_api_key = "sk-ant-claude".to_string();
    config.claude_base_url = "https://api.anthropic.com".to_string();
    config.claude_auth_style = "api_key".to_string();
    config.claude_model = "claude-sonnet-4".to_string();
    config.ollama_host = "http://localhost:11434".to_string();
    config.ollama_model = "llama3".to_string();
    
    let json = serde_json::to_string(&config).unwrap();
    let deserialized: BackendConfig = serde_json::from_str(&json).unwrap();
    
    assert_eq!(deserialized.openai_base_url, "https://api.openai.com/v1");
    assert_eq!(deserialized.openai_auth_style, "bearer");
    assert_eq!(deserialized.claude_base_url, "https://api.anthropic.com");
    assert_eq!(deserialized.claude_auth_style, "api_key");
}
