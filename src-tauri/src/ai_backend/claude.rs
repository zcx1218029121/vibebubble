use crate::ai_backend::{send_chat_request, AIBackend, AIError};

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

    fn auth_header(&self) -> (&str, String) {
        if self.auth_style == "api_key" {
            ("x-api-key", self.api_key.clone())
        } else {
            ("authorization", format!("Bearer {}", self.api_key))
        }
    }
}

#[async_trait::async_trait]
impl AIBackend for ClaudeBackend {
    fn name(&self) -> &str {
        "claude"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let body = serde_json::json!({
            "model": self.model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": text}
            ]
        });

        let mut url = self.get_url();
        // Anthropic requires version header, add as query param for custom base_url
        if !self.base_url.is_empty() {
            url = format!("{}?anthropic-version=2023-06-01", url);
        }

        let (header_name, header_value) = self.auth_header();
        let data = send_chat_request(
            &url,
            (header_name, header_value.as_str()),
            body,
        )
        .await?;

        // Parse: {"content": [{"type": "text", "text": "..."}]}
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
