# Task A: 0.1 SQLite busy_timeout + 0.2 transform timeout

## 目标
修改 `src-tauri/src/lib.rs` 和 `src-tauri/Cargo.toml`

---

## Step 1: 加 tokio 依赖

**文件**: `src-tauri/Cargo.toml`

在 `[dependencies]` 最后加:
```toml
tokio = { version = "1", features = ["process", "time"] }
```

---

## Step 2: 加 use 语句

**文件**: `src-tauri/src/lib.rs`

顶部 import 区加:
```rust
use std::time::Duration;
use tokio::process::Command as AsyncCommand;
use tokio::time::{timeout, Duration as AsyncDuration};
```

---

## Step 3: 加 SQLite busy_timeout

**文件**: `src-tauri/src/lib.rs`

找 `setup()` 里的:
```rust
let conn = Connection::open(&db_path).expect("Failed to open database");
init_db(&conn).expect("Failed to initialize database");
```

改成:
```rust
let conn = Connection::open(&db_path).expect("Failed to open database");
conn.busy_timeout(Duration::from_secs(5)).expect("Failed to set busy timeout");
init_db(&conn).expect("Failed to initialize database");
```

---

## Step 4: 改 transform_text 为 async + timeout

**文件**: `src-tauri/src/lib.rs`

找到 `transform_text` 函数，替换整个函数体:

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

## Step 5: 验证

```bash
cd /Users/loaf/workspace/typeme/src-tauri && cargo check 2>&1 | head -50
```

---

## Step 6: 完成后记录

把 "Task A 完成: 0.1 + 0.2" 追加到 /Users/loaf/workspace/typeme/PHASE0_STATUS.md
