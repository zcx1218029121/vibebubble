use crate::ai_backend::{AIBackend, AIError};

/// Claude backend — uses Anthropic Messages API
pub struct ClaudeBackend {
    api_key: String,
    base_url: String,
    auth_style: String,
    model: String,
}

impl ClaudeBackend {
    pub fn with_base_url(api_key: &str, base_url: &str, auth_style: &str, model: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            base_url: base_url.to_string(),
            auth_style: auth_style.to_string(),
            model: model.to_string(),
        }
    }

    fn get_url(&self) -> String {
        if self.base_url.is_empty() {
            "https://api.anthropic.com/v1/messages".to_string()
        } else {
            format!("{}/messages", self.base_url.trim_end_matches('/'))
        }
    }

    fn get_auth_header(&self) -> (&str, String) {
        if self.auth_style == "bearer" {
            ("authorization", format!("Bearer {}", self.api_key))
        } else {
            ("x-api-key", self.api_key.clone())
        }
    }
}

#[async_trait::async_trait]
impl AIBackend for ClaudeBackend {
    fn name(&self) -> &str {
        "claude"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let client = reqwest::Client::new();

        let body = serde_json::json!({
            "model": self.model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": text}
            ]
        });

        let (header_name, header_value) = self.get_auth_header();
        
        let mut request = client
            .post(self.get_url())
            .header(header_name, header_value)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body);

        // Only add anthropic-version header for official API
        if self.base_url.is_empty() {
            request = request.header("anthropic-version", "2023-06-01");
        }

        let response = request
            .send()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        let status = response.status();
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(AIError::RateLimit);
        }
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(AIError::Auth("Claude API Key 无效".to_string()));
        }

        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        if status != reqwest::StatusCode::OK {
            let err_msg = data["error"]["message"]
                .as_str()
                .unwrap_or("未知错误");
            return Err(AIError::Unknown(format!("Claude API 错误: {}", err_msg)));
        }

        // Claude returns: {"content": [{"type": "text", "text": "..."}]}
        let mut extracted = String::new();
        if let Some(content) = data["content"].as_array() {
            for item in content {
                if item["type"].as_str() == Some("text") {
                    if let Some(t) = item["text"].as_str() {
                        extracted = t.to_string();
                        break;
                    }
                }
            }
        }

        if extracted.is_empty() {
            return Err(AIError::Unknown("Claude 返回空内容".to_string()));
        }

        Ok(extracted)
    }
}
