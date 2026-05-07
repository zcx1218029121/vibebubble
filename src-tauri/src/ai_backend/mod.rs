pub mod minimax;
pub mod openai;
pub mod claude;
pub mod ollama;

use serde::{Deserialize, Serialize};

/// Error type for AI backend operations
#[derive(Debug)]
pub enum AIError {
    Network(String),
    Auth(String),
    RateLimit,
    Unknown(String),
}

impl std::fmt::Display for AIError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIError::Network(s) => write!(f, "网络错误: {}", s),
            AIError::Auth(s) => write!(f, "认证错误: {}", s),
            AIError::RateLimit => write!(f, "请求频率超限，请稍后重试"),
            AIError::Unknown(s) => write!(f, "未知错误: {}", s),
        }
    }
}

impl std::error::Error for AIError {}

/// AI Backend trait — all backends implement this
#[async_trait::async_trait]
pub trait AIBackend: Send + Sync {
    fn name(&self) -> &str;
    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError>;
}

/// Backend configuration stored in config.json
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderProfile {
    pub id: String,
    pub name: String,
    pub api_type: String,  // "anthropic" | "openai"
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackendConfig {
    pub profiles: Vec<ProviderProfile>,
    pub selected_profile_id: String,
}

impl Default for BackendConfig {
    fn default() -> Self {
        Self {
            profiles: Vec::new(),
            selected_profile_id: String::new(),
        }
    }
}

/// Create a backend instance based on the selected profile ID and config
pub fn create_backend(selected_profile_id: &str, config: &BackendConfig) -> Result<Box<dyn AIBackend>, AIError> {
    let profile = config.profiles.iter()
        .find(|p| p.id == selected_profile_id)
        .ok_or_else(|| AIError::Unknown(format!("未找到选中的配置: {}", selected_profile_id)))?;

    match profile.api_type.as_str() {
        "anthropic" => {
            if profile.api_key.is_empty() {
                return Err(AIError::Auth("Anthropic API Key 未配置".to_string()));
            }
            Ok(Box::new(claude::ClaudeBackend::with_base_url(
                &profile.api_key,
                &profile.base_url,
                "api_key",
                &profile.model,
            )))
        }
        "openai" => {
            if profile.api_key.is_empty() {
                return Err(AIError::Auth("OpenAI API Key 未配置".to_string()));
            }
            Ok(Box::new(openai::OpenAIBackend::with_base_url(
                &profile.api_key,
                &profile.base_url,
                "bearer",
                &profile.model,
            )))
        }
        _ => Err(AIError::Unknown(format!("未知 API 类型: {}", profile.api_type))),
    }
}
