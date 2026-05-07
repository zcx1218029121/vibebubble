# TDD Task 1.1: AI Backend Trait 抽象层

## TDD 流程
1. 先写测试（RED）
2. 写代码让测试通过（GREEN）
3. 重构（REFACTOR）

---

## Step 1: 写测试（RED）

**文件**: `src-tauri/src/tests/ai_backend_test.rs` （新建）

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_minimax_backend_name() {
        let backend = MiniMaxBackend::new("test-key", "MiniMax-Text-01");
        assert_eq!(backend.name(), "minimax");
    }

    #[tokio::test]
    async fn test_openai_backend_name() {
        let backend = OpenAIBackend::new("test-key", "gpt-4o-mini");
        assert_eq!(backend.name(), "openai");
    }

    #[tokio::test]
    async fn test_claude_backend_name() {
        let backend = ClaudeBackend::new("test-key");
        assert_eq!(backend.name(), "claude");
    }

    #[tokio::test]
    async fn test_ollama_backend_name() {
        let backend = OllamaBackend::new("http://localhost:11434");
        assert_eq!(backend.name(), "ollama");
    }
}
```

---

## Step 2: 写 trait 和后端实现（GREEN）

**文件**: `src-tauri/src/lib.rs`

在顶部添加：

```rust
// AI Backend trait
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
            AIError::Network(s) => write!(f, "Network error: {}", s),
            AIError::Auth(s) => write!(f, "Auth error: {}", s),
            AIError::RateLimit => write!(f, "Rate limit exceeded"),
            AIError::Timeout => write!(f, "Request timeout"),
            AIError::Unknown(s) => write!(f, "Unknown error: {}", s),
        }
    }
}

impl std::error::Error for AIError {}

pub trait AIBackend: Send + Sync {
    fn name(&self) -> &str;
    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError>;
}

// MiniMax Backend
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

impl AIBackend for MiniMaxBackend {
    fn name(&self) -> &str {
        "minimax"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let client = reqwest::Client::new();
        let response = client
            .post("https://api.minimax.chat/v1/text/chatcompletion_v2")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ]
            }))
            .send()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        if response.status() == reqwest::StatusCode::OK {
            let data: serde_json::Value = response.json().await.map_err(|e| AIError::Network(e.to_string()))?;
            let content = data["choices"][0]["messages"][0]["text"]
                .as_str()
                .unwrap_or("")
                .to_string();
            Ok(content)
        } else {
            Err(AIError::Auth(format!("MiniMax API error: {}", response.status())))
        }
    }
}

// OpenAI Backend
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

impl AIBackend for OpenAIBackend {
    fn name(&self) -> &str {
        "openai"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let client = reqwest::Client::new();
        let response = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ]
            }))
            .send()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        if response.status() == reqwest::StatusCode::OK {
            let data: serde_json::Value = response.json().await.map_err(|e| AIError::Network(e.to_string()))?;
            let content = data["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or("")
                .to_string();
            Ok(content)
        } else {
            Err(AIError::Auth(format!("OpenAI API error: {}", response.status())))
        }
    }
}

// Claude Backend
pub struct ClaudeBackend {
    api_key: String,
}

impl ClaudeBackend {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
        }
    }
}

impl AIBackend for ClaudeBackend {
    fn name(&self) -> &str {
        "claude"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let client = reqwest::Client::new();
        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "messages": [
                    {"role": "user", "content": format!("System: {}\n\nUser: {}", system_prompt, text)}
                ]
            }))
            .send()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        if response.status() == reqwest::StatusCode::OK {
            let data: serde_json::Value = response.json().await.map_err(|e| AIError::Network(e.to_string()))?;
            let content = data["content"][0]["text"]
                .as_str()
                .unwrap_or("")
                .to_string();
            Ok(content)
        } else {
            Err(AIError::Auth(format!("Claude API error: {}", response.status())))
        }
    }
}

// Ollama Backend
pub struct OllamaBackend {
    host: String,
}

impl OllamaBackend {
    pub fn new(host: &str) -> Self {
        Self {
            host: host.to_string(),
        }
    }
}

impl AIBackend for OllamaBackend {
    fn name(&self) -> &str {
        "ollama"
    }

    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError> {
        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/generate", self.host))
            .json(&serde_json::json!({
                "model": "llama3.2",
                "prompt": format!("System: {}\n\nUser: {}", system_prompt, text),
                "stream": false
            }))
            .send()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        if response.status() == reqwest::StatusCode::OK {
            let data: serde_json::Value = response.json().await.map_err(|e| AIError::Network(e.to_string()))?;
            let content = data["response"]
                .as_str()
                .unwrap_or("")
                .to_string();
            Ok(content)
        } else {
            Err(AIError::Unknown(format!("Ollama error: {}", response.status())))
        }
    }
}
```

---

## Step 3: 验证

```bash
cd /Users/loaf/workspace/typeme/src-tauri
cargo test ai_backend
cargo check
```

---

## Step 4: 提交

```bash
cd /Users/loaf/workspace/typeme
git add -A
git commit -m "feat Phase1.1: add AI backend trait and 4 backend implementations

- Define AIBackend trait with AIError enum
- Implement MiniMaxBackend using REST API
- Implement OpenAIBackend using REST API
- Implement ClaudeBackend using Anthropic API
- Implement OllamaBackend using local Ollama
- Add TDD tests"
git push origin main
```
