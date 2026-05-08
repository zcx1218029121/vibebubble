use crate::ai_backend::{send_chat_request, AIBackend, AIError};

/// OpenAI-compatible backend — uses Chat Completions API
pub struct OpenAIBackend {
    api_key: String,
    base_url: String,
    model: String,
    is_full_url: bool,
}

impl OpenAIBackend {
    pub fn with_base_url(api_key: &str, base_url: &str, _auth_style: &str, model: &str, is_full_url: bool) -> Self {
        Self {
            api_key: api_key.to_string(),
            base_url: base_url.to_string(),
            model: model.to_string(),
            is_full_url,
        }
    }

    fn get_url(&self) -> String {
        if self.base_url.is_empty() {
            "https://api.openai.com/v1/chat/completions".to_string()
        } else if self.is_full_url {
            self.base_url.trim_end_matches('/').to_string()
        } else {
            format!("{}/chat/completions", self.base_url.trim_end_matches('/'))
        }
    }
}

#[async_trait::async_trait]
impl AIBackend for OpenAIBackend {
    fn name(&self) -> &str {
        "openai"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ]
        });

        let data = send_chat_request(
            &self.get_url(),
            ("Authorization", &format!("Bearer {}", self.api_key)),
            body,
        )
        .await?;

        // Parse: {"choices": [{"message": {"content": "..."}}]}
        let content = data["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| AIError::Unknown("响应格式错误".to_string()))?;

        if content.is_empty() {
            return Err(AIError::Unknown("返回内容为空".to_string()));
        }

        Ok(content.to_string())
    }
}
