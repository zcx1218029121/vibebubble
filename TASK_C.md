# Task C: 0.4 配置校验

## 目标
在 `src-tauri/src/lib.rs` 的 `load_config` 函数加 schema 校验

---

## Step 1: 找到 load_config 函数

**文件**: `src-tauri/src/lib.rs`

找到 `load_config` 函数，替换其实现:

```rust
#[tauri::command]
async fn load_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = get_config_path(&app);
    info!("Loading config from: {:?}", path);

    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let mut config: AppConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        
        // Validate and fill defaults for missing fields
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
        
        info!("Config loaded successfully");
        Ok(config)
    } else {
        info!("No config file found, using defaults");
        Ok(AppConfig::default())
    }
}
```

---

## Step 2: 验证

```bash
cd /Users/loaf/workspace/typeme/src-tauri && cargo check 2>&1 | head -50
```

---

## Step 3: 完成后记录

把 "Task C 完成: 0.4 配置校验" 追加到 /Users/loaf/workspace/typeme/PHASE0_STATUS.md
