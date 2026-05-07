use crate::ai_backend::{AIBackend, AIError};

/// Ollama backend — uses local Ollama REST API
pub struct OllamaBackend {
    host: String,
    model: String,
}

impl OllamaBackend {
    pub fn new(host: &str, model: &str) -> Self {
        Self {
            host: host.trim_end_matches('/').to_string(),
            model: model.to_string(),
        }
    }
}

#[async_trait::async_trait]
impl AIBackend for OllamaBackend {
    fn name(&self) -> &str {
        "ollama"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let client = reqwest::Client::new();

        // Use /api/chat endpoint (structured messages, like OpenAI format)
        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            "stream": false
        });

        let response = client
            .post(format!("{}/api/chat", self.host))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AIError::Network(format!("无法连接 Ollama ({}): {}", self.host, e)))?;

        let status = response.status();
        if status != reqwest::StatusCode::OK {
            return Err(AIError::Unknown(format!("Ollama 错误: HTTP {}", status)));
        }

        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        let content = data["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        if content.is_empty() {
            return Err(AIError::Unknown("Ollama 返回空内容".to_string()));
        }

        Ok(content)
    }
}
