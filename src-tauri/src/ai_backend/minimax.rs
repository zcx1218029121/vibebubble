use crate::ai_backend::{AIBackend, AIError};

/// MiniMax backend — uses MiniMax REST API
pub struct MiniMaxBackend {
    api_key: String,
    model: String,
}

impl MiniMaxBackend {
    pub fn new(api_key: &str, model: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: model.to_string(),
        }
    }
}

#[async_trait::async_trait]
impl AIBackend for MiniMaxBackend {
    fn name(&self) -> &str {
        "minimax"
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
            .post("https://api.minimax.chat/v1/text/chatcompletion_v2")
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
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(AIError::Auth(format!("MiniMax API 认证失败: {}", status)));
        }

        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        if status != reqwest::StatusCode::OK {
            let err_msg = data["base_resp"]["status_msg"]
                .as_str()
                .unwrap_or("未知错误");
            return Err(AIError::Unknown(format!("MiniMax API 错误: {}", err_msg)));
        }

        // MiniMax API returns: {"choices": [{"message": {"content": "..."}}]}
        let content = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        if content.is_empty() {
            return Err(AIError::Unknown("MiniMax 返回空内容".to_string()));
        }

        Ok(content)
    }
}
