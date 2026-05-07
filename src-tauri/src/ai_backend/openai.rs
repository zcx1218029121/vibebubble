use crate::ai_backend::{AIBackend, AIError};

/// OpenAI backend — uses OpenAI Chat Completions API
pub struct OpenAIBackend {
    api_key: String,
    model: String,
}

impl OpenAIBackend {
    pub fn new(api_key: &str, model: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: model.to_string(),
        }
    }
}

#[async_trait::async_trait]
impl AIBackend for OpenAIBackend {
    fn name(&self) -> &str {
        "openai"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let client = reqwest::Client::new();

        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ]
        });

        let response = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        let status = response.status();
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(AIError::RateLimit);
        }
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(AIError::Auth("OpenAI API Key 无效".to_string()));
        }

        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        if status != reqwest::StatusCode::OK {
            let err_msg = data["error"]["message"]
                .as_str()
                .unwrap_or("未知错误");
            return Err(AIError::Unknown(format!("OpenAI API 错误: {}", err_msg)));
        }

        let content = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        if content.is_empty() {
            return Err(AIError::Unknown("OpenAI 返回空内容".to_string()));
        }

        Ok(content)
    }
}
