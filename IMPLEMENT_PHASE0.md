# Phase 0 实施任务

## 目标
修复 VibeBubble v0.5.0 的 4 个明确 Bug，全部在 `main` 分支进行。

---

## 任务 0.1 — SQLite 并发 Bug

**文件**: `src-tauri/src/lib.rs`

1. 顶部 import 区加:
```rust
use std::time::Duration;
```

2. `Connection::open` 后加:
```rust
conn.busy_timeout(Duration::from_secs(5)).expect("Failed to set busy timeout");
```

参考位置: `setup()` 里 `Connection::open(&db_path)` 之后

---

## 任务 0.2 — transform_text Timeout

**文件**: `src-tauri/Cargo.toml`

1. `[dependencies]` 里加:
```toml
tokio = { version = "1", features = ["process", "time"] }
```

**文件**: `src-tauri/src/lib.rs`

2. 顶部 import 加:
```rust
use tokio::process::Command as AsyncCommand;
use tokio::time::{timeout, Duration as AsyncDuration};
```

3. `transform_text` 函数改成 `async fn`:
```rust
#[tauri::command]
async fn transform_text(text: String, system_prompt: String) -> Result<String, String> {
    info!("Transforming text: {}", &text[..text.len().min(50)]);

    let result = timeout(
        AsyncDuration::from_secs(60),
        AsyncCommand::new("mmx")
            .args(["text", "chat", "--system", &system_prompt, "--", &text])
            .output()
    ).await;

    let output = match result {
        Ok(Ok(out)) => out,
        Ok(Err(e)) => {
            error!("Failed to execute mmx: {}", e);
            return Err(format!("执行失败: {}", e));
        }
        Err(_) => {
            error!("mmx timed out after 60 seconds");
            return Err("AI 处理超时（60秒），请重试".to_string());
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("mmx returned error: {}", stderr);
        return Err(format!("AI 调用失败: {}", stderr));
    }

    let result_text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    info!("Transform result: {}", &result_text[..result_text.len().min(50)]);
    Ok(result_text)
}
```

---

## 任务 0.3 — 清理假多后端 UI

**文件**: `src/App.tsx`

1. 找到设置面板里的 AI 后端下拉框（`settingsTab === "general"` 里的 select）

2. 只保留:
```tsx
<select value={config.selected_backend} onChange={...}>
  <option value="minimax">MiniMax (mmx CLI)</option>
</select>
```

删掉所有 `disabled` 的 option。

3. `AppConfig` 接口里的 `selected_backend` 字段**保留**（Phase 1 会用到），但前端下拉框只显示一个选项。

---

## 任务 0.4 — 配置校验

**文件**: `src-tauri/src/lib.rs`

在 `load_config` 里加校验，缺失字段时用默认值填充而不是整体替换:

```rust
#[tauri::command]
async fn load_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = get_config_path(&app);
    info!("Loading config from: {:?}", path);

    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let mut config: AppConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        
        // Validate and fill defaults
        if config.templates.is_empty() {
            config.templates = AppConfig::default().templates;
        }
        if config.selected_template_id.is_empty() {
            config.selected_template_id = "default".to_string();
        }
        if config.output_mode.is_empty() {
            config.output_mode = "clipboard".to_string();
        }
        if config.selected_backend.is_empty() {
            config.selected_backend = "minimax".to_string();
        }
        
        Ok(config)
    } else {
        Ok(AppConfig::default())
    }
}
```

---

## 验证步骤

改完后执行:

```bash
cd /Users/loaf/workspace/typeme
npm run tauri build
```

构建成功后在 `src-tauri/target/release/bundle/dmg/` 找到 app 安装测试。

---

## Git 提交

```
git add -A
git commit -m "fix Phase0: SQLite busy_timeout, transform timeout, cleanup fake backend UI, config validation

- Add busy_timeout(5s) to SQLite Connection
- Add 60s timeout to transform_text via tokio
- Remove disabled OpenAI/Claude/Ollama dropdown options
- Add config schema validation on load"
```

然后 `git push origin main`
