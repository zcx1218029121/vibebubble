# TDD Task 1.6: Backend Router

## TDD 流程
1. 先写测试（RED）
2. 写代码让测试通过（GREEN）
3. 重构（REFACTOR）

---

## Step 1: 写测试（RED）

**文件**: `src-tauri/src/tests/backend_router_test.rs` （新建）

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_router_minimax() {
        let config = AppConfig {
            selected_backend: "minimax".to_string(),
            // ... 其他字段用默认值
        };
        let backend = create_backend(&config);
        assert_eq!(backend.name(), "minimax");
    }

    #[tokio::test]
    async fn test_router_openai() {
        let config = AppConfig {
            selected_backend: "openai".to_string(),
            openai_api_key: "test-key".to_string(),
            openai_model: "gpt-4o-mini".to_string(),
            // ... 其他字段
        };
        let backend = create_backend(&config);
        assert_eq!(backend.name(), "openai");
    }
}
```

---

## Step 2: 写 Router 实现（GREEN）

**文件**: `src-tauri/src/lib.rs`

添加 `create_backend` 函数：

```rust
pub fn create_backend(config: &AppConfig) -> Box<dyn AIBackend> {
    match config.selected_backend.as_str() {
        "minimax" => Box::new(MiniMaxBackend::new()),
        "openai" => Box::new(OpenAIBackend::new(
            &config.openai_api_key,
            &config.openai_model,
        )),
        "claude" => Box::new(ClaudeBackend::new(&config.claude_api_key)),
        "ollama" => Box::new(OllamaBackend::new(&config.ollama_host)),
        _ => Box::new(MiniMaxBackend::new()), // default fallback
    }
}
```

更新 `AppConfig` 加新字段：

```rust
pub struct AppConfig {
    // ... existing fields ...
    pub openai_api_key: String,
    pub openai_model: String,
    pub claude_api_key: String,
    pub ollama_host: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            templates: vec![],
            selected_template_id: "default".to_string(),
            output_mode: "clipboard".to_string(),
            selected_backend: "minimax".to_string(),
            openai_api_key: String::new(),
            openai_model: "gpt-4o-mini".to_string(),
            claude_api_key: String::new(),
            ollama_host: "http://localhost:11434".to_string(),
        }
    }
}
```

更新 `transform_text` command：

```rust
#[tauri::command]
async fn transform_text(text: String, system_prompt: String) -> Result<String, String> {
    info!("Transforming text: {}", &text[..text.len().min(50)]);

    let config = load_config_sync().await.map_err(|e| e.to_string())?;
    let backend = create_backend(&config);

    backend.transform(&text, &system_prompt)
        .await
        .map_err(|e| e.to_string())
}
```

---

## Step 3: 验证

```bash
cd /Users/loaf/workspace/typeme/src-tauri
cargo test backend_router
cargo check
```

---

## Step 4: 提交

```bash
cd /Users/loaf/workspace/typeme
git add -A
git commit -m "feat Phase1.6: add backend router with dynamic backend selection

- Add create_backend() function for dynamic backend creation
- Add new config fields for API keys and hosts
- Update transform_text to use router
- Add Default impl for new config fields

Co-authored-by: Claude <noreply@anthropic.com>"
git push origin main
```
