// Config Module Tests
// TDD: Write tests first, then implement

use crate::ai_backend::BackendConfig;

#[test]
fn test_backend_config_default() {
    let config = BackendConfig::default();
    
    // Verify default values
    assert_eq!(config.minimax_model, "MiniMax-Text-01");
    assert_eq!(config.openai_model, "gpt-4o-mini");
    assert_eq!(config.claude_model, "claude-sonnet-4-20250514");
    assert_eq!(config.ollama_host, "http://localhost:11434");
    assert_eq!(config.ollama_model, "llama3.2");
    
    // API keys should be empty by default
    assert!(config.minimax_api_key.is_empty());
    assert!(config.openai_api_key.is_empty());
    assert!(config.claude_api_key.is_empty());
}

#[test]
fn test_backend_config_clone() {
    let config = BackendConfig::default();
    let cloned = config.clone();
    
    assert_eq!(cloned.minimax_model, config.minimax_model);
    assert_eq!(cloned.openai_model, config.openai_model);
}

#[test]
fn test_backend_config_serialize() {
    let config = BackendConfig::default();
    let json = serde_json::to_string(&config).unwrap();
    
    // Should be able to deserialize back
    let deserialized: BackendConfig = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.minimax_model, config.minimax_model);
}

#[test]
fn test_backend_config_with_api_keys() {
    let mut config = BackendConfig::default();
    config.openai_api_key = "sk-test-key".to_string();
    config.claude_api_key = "sk-ant-test-key".to_string();
    
    assert!(!config.openai_api_key.is_empty());
    assert!(!config.claude_api_key.is_empty());
    assert_eq!(config.openai_api_key, "sk-test-key");
}

// AppConfig tests
#[test]
fn test_app_config_default() {
    use crate::AppConfig;
    
    let config = AppConfig::default();
    
    // Should have default template
    assert!(!config.templates.is_empty());
    assert_eq!(config.templates[0].id, "default");
    
    // Default values check
    assert_eq!(config.selected_template_id, "default");
    assert_eq!(config.output_mode, "clipboard");
    assert_eq!(config.selected_backend, "minimax");
}

#[test]
fn test_app_config_default_has_one_template() {
    use crate::AppConfig;
    
    let config = AppConfig::default();
    assert_eq!(config.templates.len(), 1);
    assert_eq!(config.templates[0].name, "想法→任务");
}

#[test]
fn test_app_config_serialize_roundtrip() {
    use crate::AppConfig;
    
    let config = AppConfig::default();
    let json = serde_json::to_string(&config).unwrap();
    let deserialized: AppConfig = serde_json::from_str(&json).unwrap();
    
    assert_eq!(deserialized.selected_backend, config.selected_backend);
    assert_eq!(deserialized.selected_template_id, config.selected_template_id);
    assert_eq!(deserialized.templates.len(), config.templates.len());
}

#[test]
fn test_app_config_with_custom_template() {
    use crate::{AppConfig, PromptTemplate};
    
    let mut config = AppConfig::default();
    config.templates.push(PromptTemplate {
        id: "custom".to_string(),
        name: "Custom".to_string(),
        prompt: "Custom prompt".to_string(),
        description: "Custom description".to_string(),
    });
    
    assert_eq!(config.templates.len(), 2);
    assert_eq!(config.templates[1].id, "custom");
}

#[test]
fn test_app_config_output_mode_values() {
    use crate::AppConfig;
    
    let config = AppConfig::default();
    // Valid output modes should be "clipboard" or "manual"
    assert!(config.output_mode == "clipboard" || config.output_mode == "manual");
}

// HistoryItem tests
#[test]
fn test_history_item_structure() {
    use crate::HistoryItem;
    
    let item = HistoryItem {
        id: 1,
        input: "Test input".to_string(),
        output: "Test output".to_string(),
        output_preview: "Test output preview".to_string(),
        template_name: "default".to_string(),
        timestamp: 1234567890,
    };
    
    assert_eq!(item.id, 1);
    assert_eq!(item.input, "Test input");
    assert_eq!(item.output, "Test output");
    assert_eq!(item.output_preview, "Test output preview");
    assert_eq!(item.template_name, "default");
    assert_eq!(item.timestamp, 1234567890);
}

#[test]
fn test_history_item_serialize() {
    use crate::HistoryItem;
    
    let item = HistoryItem {
        id: 1,
        input: "Test input".to_string(),
        output: "Test output".to_string(),
        output_preview: "Test output preview".to_string(),
        template_name: "default".to_string(),
        timestamp: 1234567890,
    };
    
    let json = serde_json::to_string(&item).unwrap();
    let deserialized: HistoryItem = serde_json::from_str(&json).unwrap();
    
    assert_eq!(deserialized.id, item.id);
    assert_eq!(deserialized.input, item.input);
    assert_eq!(deserialized.output, item.output);
}

// PromptTemplate tests
#[test]
fn test_prompt_template_structure() {
    use crate::PromptTemplate;
    
    let template = PromptTemplate {
        id: "test".to_string(),
        name: "Test Template".to_string(),
        prompt: "Test prompt content".to_string(),
        description: "Test description".to_string(),
    };
    
    assert_eq!(template.id, "test");
    assert_eq!(template.name, "Test Template");
    assert_eq!(template.prompt, "Test prompt content");
    assert_eq!(template.description, "Test description");
}
