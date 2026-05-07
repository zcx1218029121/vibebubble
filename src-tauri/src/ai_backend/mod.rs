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
    Timeout,
    Unknown(String),
}

impl std::fmt::Display for AIError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIError::Network(s) => write!(f, "网络错误: {}", s),
            AIError::Auth(s) => write!(f, "认证错误: {}", s),
            AIError::RateLimit => write!(f, "请求频率超限，请稍后重试"),
            AIError::Timeout => write!(f, "请求超时"),
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
pub struct BackendConfig {
    /// MiniMax API Key
    pub minimax_api_key: String,
    /// MiniMax model name
    pub minimax_model: String,
    /// OpenAI API Key
    pub openai_api_key: String,
    /// OpenAI model name
    pub openai_model: String,
    /// Claude API Key
    pub claude_api_key: String,
    /// Claude model name
    pub claude_model: String,
    /// Ollama host URL
    pub ollama_host: String,
    /// Ollama model name
    pub ollama_model: String,
}

impl Default for BackendConfig {
    fn default() -> Self {
        Self {
            minimax_api_key: String::new(),
            minimax_model: "MiniMax-Text-01".to_string(),
            openai_api_key: String::new(),
            openai_model: "gpt-4o-mini".to_string(),
            claude_api_key: String::new(),
            claude_model: "claude-sonnet-4-20250514".to_string(),
            ollama_host: "http://localhost:11434".to_string(),
            ollama_model: "llama3.2".to_string(),
        }
    }
}

/// Create a backend instance based on the selected backend name and config
pub fn create_backend(selected: &str, config: &BackendConfig) -> Result<Box<dyn AIBackend>, AIError> {
    match selected {
        "minimax" => Ok(Box::new(minimax::MiniMaxBackend::new(
            &config.minimax_api_key,
            &config.minimax_model,
        ))),
        "openai" => {
            if config.openai_api_key.is_empty() {
                return Err(AIError::Auth("OpenAI API Key 未配置".to_string()));
            }
            Ok(Box::new(openai::OpenAIBackend::new(
                &config.openai_api_key,
                &config.openai_model,
            )))
        }
        "claude" => {
            if config.claude_api_key.is_empty() {
                return Err(AIError::Auth("Claude API Key 未配置".to_string()));
            }
            Ok(Box::new(claude::ClaudeBackend::new(
                &config.claude_api_key,
                &config.claude_model,
            )))
        }
        "ollama" => Ok(Box::new(ollama::OllamaBackend::new(
            &config.ollama_host,
            &config.ollama_model,
        ))),
        _ => Err(AIError::Unknown(format!("未知后端: {}", selected))),
    }
}
