// Backend Router Tests - TDD 1.6
#[cfg(test)]
mod tests {
    use crate::ai_backend::{BackendConfig, ProviderProfile, create_backend};

    #[test]
    fn test_create_backend_openai_profile() {
        let profile = ProviderProfile {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            api_type: "openai".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: "test-key".to_string(),
            model: "gpt-4o-mini".to_string(),
        };
        let config = BackendConfig {
            profiles: vec![profile],
            selected_profile_id: "openai".to_string(),
        };
        let backend = create_backend("openai", &config).unwrap();
        assert_eq!(backend.name(), "openai");
    }

    #[test]
    fn test_create_backend_anthropic_profile() {
        let profile = ProviderProfile {
            id: "claude".to_string(),
            name: "Claude".to_string(),
            api_type: "anthropic".to_string(),
            base_url: "https://api.anthropic.com".to_string(),
            api_key: "test-key".to_string(),
            model: "claude-sonnet-4-20250514".to_string(),
        };
        let config = BackendConfig {
            profiles: vec![profile],
            selected_profile_id: "claude".to_string(),
        };
        let backend = create_backend("claude", &config).unwrap();
        assert_eq!(backend.name(), "claude");
    }

    // Issue 3: Validation tests

    #[test]
    fn test_create_backend_empty_selected_id() {
        let config = BackendConfig {
            profiles: vec![],
            selected_profile_id: "".to_string(),
        };
        let result = create_backend("", &config);
        assert!(result.is_err());
        let err_msg = result.err().map(|e| e.to_string()).unwrap_or_default();
        assert!(err_msg.contains("未选择任何配置"), "Got: {}", err_msg);
    }

    #[test]
    fn test_create_backend_empty_model() {
        let profile = ProviderProfile {
            id: "test".to_string(),
            name: "Test".to_string(),
            api_type: "openai".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: "test-key".to_string(),
            model: "".to_string(),  // Empty model
        };
        let config = BackendConfig {
            profiles: vec![profile],
            selected_profile_id: "test".to_string(),
        };
        let result = create_backend("test", &config);
        assert!(result.is_err());
        let err_msg = result.err().map(|e| e.to_string()).unwrap_or_default();
        assert!(err_msg.contains("模型名称未配置"), "Got: {}", err_msg);
    }

    #[test]
    fn test_create_backend_invalid_api_type() {
        let profile = ProviderProfile {
            id: "test".to_string(),
            name: "Test".to_string(),
            api_type: "invalid".to_string(),
            base_url: "".to_string(),
            api_key: "test-key".to_string(),
            model: "gpt-4o-mini".to_string(),
        };
        let config = BackendConfig {
            profiles: vec![profile],
            selected_profile_id: "test".to_string(),
        };
        let result = create_backend("test", &config);
        assert!(result.is_err());
        let err_msg = result.err().map(|e| e.to_string()).unwrap_or_default();
        assert!(err_msg.contains("不支持的 API 类型"), "Got: {}", err_msg);
    }

    #[test]
    fn test_create_backend_missing_profile() {
        let config = BackendConfig {
            profiles: vec![],
            selected_profile_id: "nonexistent".to_string(),
        };
        let result = create_backend("nonexistent", &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_backend_openai_requires_api_key() {
        let profile = ProviderProfile {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            api_type: "openai".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: String::new(),  // Empty API key
            model: "gpt-4o-mini".to_string(),
        };
        let config = BackendConfig {
            profiles: vec![profile],
            selected_profile_id: "openai".to_string(),
        };
        let result = create_backend("openai", &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_backend_anthropic_requires_api_key() {
        let profile = ProviderProfile {
            id: "claude".to_string(),
            name: "Claude".to_string(),
            api_type: "anthropic".to_string(),
            base_url: "https://api.anthropic.com".to_string(),
            api_key: String::new(),  // Empty API key
            model: "claude-sonnet-4-20250514".to_string(),
        };
        let config = BackendConfig {
            profiles: vec![profile],
            selected_profile_id: "claude".to_string(),
        };
        let result = create_backend("claude", &config);
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_backend_trait_object_sends() {
        // Verify that Box<dyn AIBackend> satisfies Send
        fn assert_send<T: Send>(_: &T) {}
        
        let profile = ProviderProfile {
            id: "test".to_string(),
            name: "Test".to_string(),
            api_type: "openai".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: "test-key".to_string(),
            model: "gpt-4o-mini".to_string(),
        };
        let config = BackendConfig {
            profiles: vec![profile],
            selected_profile_id: "test".to_string(),
        };
        let backend = create_backend("test", &config).unwrap();
        assert_send(&backend);
    }

    #[tokio::test]
    async fn test_backend_trait_object_sync() {
        // Verify that Box<dyn AIBackend> satisfies Sync
        fn assert_sync<T: Sync>(_: &T) {}
        
        let profile = ProviderProfile {
            id: "test".to_string(),
            name: "Test".to_string(),
            api_type: "openai".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: "test-key".to_string(),
            model: "gpt-4o-mini".to_string(),
        };
        let config = BackendConfig {
            profiles: vec![profile],
            selected_profile_id: "test".to_string(),
        };
        let backend = create_backend("test", &config).unwrap();
        assert_sync(&backend);
    }
}
