// Config Module Tests - Updated for profile-based BackendConfig

use crate::ai_backend::{BackendConfig, ProviderProfile};

#[test]
fn test_backend_config_default() {
    let config = BackendConfig::default();
    
    // Verify default values
    assert!(config.profiles.is_empty());
    assert!(config.selected_profile_id.is_empty());
}

#[test]
fn test_backend_config_with_profiles() {
    let profile = ProviderProfile {
        id: "openai".to_string(),
        name: "OpenAI".to_string(),
        api_type: "openai".to_string(),
        base_url: "https://api.openai.com/v1".to_string(),
        api_key: "sk-test-key".to_string(),
        model: "gpt-4o-mini".to_string(),
        is_full_url: false,
    };
    
    let config = BackendConfig {
        profiles: vec![profile],
        selected_profile_id: "openai".to_string(),
    };
    
    assert_eq!(config.profiles.len(), 1);
    assert_eq!(config.selected_profile_id, "openai");
    assert_eq!(config.profiles[0].api_key, "sk-test-key");
    assert_eq!(config.profiles[0].model, "gpt-4o-mini");
}

#[test]
fn test_backend_config_clone() {
    let profile = ProviderProfile {
        id: "claude".to_string(),
        name: "Claude".to_string(),
        api_type: "anthropic".to_string(),
        base_url: "https://api.anthropic.com".to_string(),
        api_key: "sk-ant-test".to_string(),
        model: "claude-sonnet-4-20250514".to_string(),
        is_full_url: false,
    };
    
    let config = BackendConfig {
        profiles: vec![profile.clone()],
        selected_profile_id: "claude".to_string(),
    };
    let cloned = config.clone();
    
    assert_eq!(cloned.profiles.len(), 1);
    assert_eq!(cloned.selected_profile_id, "claude");
    assert_eq!(cloned.profiles[0].api_key, config.profiles[0].api_key);
}

#[test]
fn test_backend_config_serialize() {
    let profile = ProviderProfile {
        id: "openai".to_string(),
        name: "OpenAI".to_string(),
        api_type: "openai".to_string(),
        base_url: "https://api.openai.com/v1".to_string(),
        api_key: "sk-test".to_string(),
        model: "gpt-4o-mini".to_string(),
        is_full_url: false,
    };
    
    let config = BackendConfig {
        profiles: vec![profile],
        selected_profile_id: "openai".to_string(),
    };
    
    let json = serde_json::to_string(&config).unwrap();
    let deserialized: BackendConfig = serde_json::from_str(&json).unwrap();
    
    assert_eq!(deserialized.profiles.len(), 1);
    assert_eq!(deserialized.selected_profile_id, "openai");
    assert_eq!(deserialized.profiles[0].api_key, "sk-test");
}

#[test]
fn test_provider_profile_fields() {
    let profile = ProviderProfile {
        id: "test".to_string(),
        name: "Test Provider".to_string(),
        api_type: "openai".to_string(),
        base_url: "https://custom.api.com/v1".to_string(),
        api_key: "key".to_string(),
        model: "gpt-4".to_string(),
        is_full_url: false,
    };
    
    assert_eq!(profile.id, "test");
    assert_eq!(profile.name, "Test Provider");
    assert_eq!(profile.api_type, "openai");
    assert_eq!(profile.base_url, "https://custom.api.com/v1");
    assert_eq!(profile.api_key, "key");
    assert_eq!(profile.model, "gpt-4");
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
        // output is no longer stored in history
        output_preview: "Test input preview".to_string(),
        template_name: "default".to_string(),
        timestamp: 1234567890,
    };
    
    assert_eq!(item.id, 1);
    assert_eq!(item.input, "Test input");
    assert_eq!(item.output_preview, "Test input preview");
    assert_eq!(item.template_name, "default");
    assert_eq!(item.timestamp, 1234567890);
}

#[test]
fn test_history_item_serialize() {
    use crate::HistoryItem;
    
    let item = HistoryItem {
        id: 1,
        input: "Test input".to_string(),
        // output is no longer stored in history
        output_preview: "Test input preview".to_string(),
        template_name: "default".to_string(),
        timestamp: 1234567890,
    };
    
    let json = serde_json::to_string(&item).unwrap();
    let deserialized: HistoryItem = serde_json::from_str(&json).unwrap();
    
    assert_eq!(deserialized.id, item.id);
    assert_eq!(deserialized.input, item.input);
    assert_eq!(deserialized.output_preview, item.output_preview);
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
