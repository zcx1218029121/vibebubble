pub mod openai;
pub mod claude;

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

/// Common HTTP request helper — reduces duplication across backends
pub async fn send_chat_request(
    url: &str,
    auth_header: (&str, &str),  // (header_name, header_value)
    body: serde_json::Value,
) -> Result<serde_json::Value, AIError> {
    let client = reqwest::Client::new();

    let response = client
        .post(url)
        .header(auth_header.0, auth_header.1)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| AIError::Network(e.to_string()))?;

    let status = response.status();
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(AIError::RateLimit);
    }
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err(AIError::Auth("API Key 无效或无权限".to_string()));
    }

    // Try to parse JSON, but if it fails, get raw text for debugging
    let data = match response.json::<serde_json::Value>().await {
        Ok(data) => data,
        Err(_) => {
            return Err(AIError::Unknown(format!(
                "API 返回错误 (HTTP {}). 请检查 base_url 配置是否正确",
                status
            )));
        }
    };

    if status != reqwest::StatusCode::OK {
        let err_msg = data["error"]["message"]
            .as_str()
            .or_else(|| data["error"]["type"].as_str())
            .unwrap_or("未知错误");
        return Err(AIError::Unknown(format!(
            "API 错误 (HTTP {}): {}. 请检查 API Key 和 base_url 是否正确",
            status, err_msg
        )));
    }

    Ok(data)
}

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
    #[serde(default)]
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    #[serde(default)]
    pub is_full_url: bool,  // true = base_url is complete URL, don't append path
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
    // Validate selected_profile_id is not empty
    if selected_profile_id.is_empty() {
        return Err(AIError::Unknown("未选择任何配置".to_string()));
    }

    // Find profile
    let profile = config.profiles.iter()
        .find(|p| p.id == selected_profile_id)
        .ok_or_else(|| AIError::Unknown(format!("未找到选中的配置: {}", selected_profile_id)))?;

    // Validate api_type
    match profile.api_type.as_str() {
        "anthropic" | "openai" => {}
        _ => return Err(AIError::Unknown(format!("不支持的 API 类型: {}", profile.api_type))),
    }

    // Validate model
    if profile.model.is_empty() {
        return Err(AIError::Unknown("模型名称未配置".to_string()));
    }

    // Create backend
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
                profile.is_full_url,
            )))
        }
        "openai" => {
            if profile.api_key.is_empty() {
                return Err(AIError::Auth("API Key 未配置".to_string()));
            }
            Ok(Box::new(openai::OpenAIBackend::new(
                &profile.api_key,
                &profile.base_url,
                &profile.model,
                profile.is_full_url,
            )))
        }
        _ => unreachable!(),
    }
}
