use crate::ai_backend::{AIBackend, AIError};

/// OpenAI backend — uses OpenAI Chat Completions API
pub struct OpenAIBackend {
    api_key: String,
    base_url: String,
    auth_style: String,
    model: String,
}

impl OpenAIBackend {
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
            "https://api.openai.com/v1/chat/completions".to_string()
        } else {
            format!("{}/chat/completions", self.base_url.trim_end_matches('/'))
        }
    }

    fn get_auth_header(&self) -> (&str, String) {
        if self.auth_style == "api_key" {
            ("x-api-key", self.api_key.clone())
        } else {
            ("authorization", format!("Bearer {}", self.api_key))
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

        let (header_name, header_value) = self.get_auth_header();
        
        let response = client
            .post(self.get_url())
            .header(header_name, header_value)
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
