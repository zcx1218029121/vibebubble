#[cfg(test)]
mod tests;

mod ai_backend;

use ai_backend::{AIError, create_backend};
use log::{error, info, warn};
use nix::fcntl::{flock, FlockArg};
use rusqlite::{Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{menu::{Menu, MenuItem}, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}, AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent, ShortcutState};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub prompt: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(rename = "version", default)]
    pub version: u32,
    #[serde(rename = "templates")]
    pub templates: Vec<PromptTemplate>,
    #[serde(rename = "selected_template_id")]
    pub selected_template_id: String,
    #[serde(rename = "output_mode")]
    pub output_mode: String,
    #[serde(rename = "backend")]
    pub backend: ai_backend::BackendConfig,
    #[serde(rename = "shortcut", default)]
    pub shortcut: ShortcutConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: 1,
            templates: vec![PromptTemplate {
                id: "default".to_string(),
                name: "想法→任务".to_string(),
                description: "将粗糙想法转化为清晰可执行的任务描述".to_string(),
                prompt: DEFAULT_PROMPT.to_string(),
            }],
            selected_template_id: "default".to_string(),
            output_mode: "clipboard".to_string(),
            backend: ai_backend::BackendConfig::default(),
            shortcut: ShortcutConfig::default(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: i64,
    pub input: String,
    // output is NOT stored in history - it's returned directly and user can copy it
    // we only store a preview for display purposes
    pub output_preview: String,
    pub template_name: String,
    pub timestamp: i64,
    pub favorite: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShortcutConfig {
    pub modifiers: Vec<String>, // "meta", "ctrl", "alt", "shift"
    pub key: String,           // "v", "a", "F1", etc.
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            modifiers: vec!["meta".to_string(), "shift".to_string()],
            key: "v".to_string(),
        }
    }
}

const MAX_OUTPUT_PREVIEW: usize = 200;

/// Truncate output to MAX_OUTPUT_PREVIEW chars with "..." suffix
fn truncate_output(output: &str) -> String {
    let chars: Vec<char> = output.chars().collect();
    if chars.len() > MAX_OUTPUT_PREVIEW {
        chars[..MAX_OUTPUT_PREVIEW].iter().collect::<String>() + "..."
    } else {
        output.to_string()
    }
}

/// Parse modifiers and key string into a Shortcut
fn parse_shortcut(modifiers: &[String], key: &str) -> Shortcut {
    let mut mods = Modifiers::empty();
    for m in modifiers {
        match m.as_str() {
            "meta" | "cmd" => mods |= Modifiers::META,
            "ctrl" => mods |= Modifiers::CONTROL,
            "alt" => mods |= Modifiers::ALT,
            "shift" => mods |= Modifiers::SHIFT,
            _ => {}
        }
    }
    let code = code_from_string(key);
    Shortcut::new(Some(mods), code)
}

/// Create the shortcut callback closure that shows and focuses the main window
fn setup_shortcut_callback(app_handle: AppHandle) -> impl Fn(&AppHandle, &Shortcut, ShortcutEvent) {
    move |_app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            if let Some(window) = app_handle.get_webview_window("main") {
                match window.is_visible() {
                    Ok(true) => {
                        info!("Hiding bubble");
                        let _ = window.hide();
                    }
                    Ok(false) => {
                        info!("Showing bubble");
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    Err(_) => {
                        info!("Showing bubble (visibility check failed)");
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        }
    }
}

/// Map string key to Code enum
fn code_from_string(key: &str) -> Code {
    match key.to_uppercase().as_str() {
        "A" => Code::KeyA,
        "B" => Code::KeyB,
        "C" => Code::KeyC,
        "D" => Code::KeyD,
        "E" => Code::KeyE,
        "F" => Code::KeyF,
        "G" => Code::KeyG,
        "H" => Code::KeyH,
        "I" => Code::KeyI,
        "J" => Code::KeyJ,
        "K" => Code::KeyK,
        "L" => Code::KeyL,
        "M" => Code::KeyM,
        "N" => Code::KeyN,
        "O" => Code::KeyO,
        "P" => Code::KeyP,
        "Q" => Code::KeyQ,
        "R" => Code::KeyR,
        "S" => Code::KeyS,
        "T" => Code::KeyT,
        "U" => Code::KeyU,
        "V" => Code::KeyV,
        "W" => Code::KeyW,
        "X" => Code::KeyX,
        "Y" => Code::KeyY,
        "Z" => Code::KeyZ,
        "0" => Code::Digit0,
        "1" => Code::Digit1,
        "2" => Code::Digit2,
        "3" => Code::Digit3,
        "4" => Code::Digit4,
        "5" => Code::Digit5,
        "6" => Code::Digit6,
        "7" => Code::Digit7,
        "8" => Code::Digit8,
        "9" => Code::Digit9,
        "F1" => Code::F1,
        "F2" => Code::F2,
        "F3" => Code::F3,
        "F4" => Code::F4,
        "F5" => Code::F5,
        "F6" => Code::F6,
        "F7" => Code::F7,
        "F8" => Code::F8,
        "F9" => Code::F9,
        "F10" => Code::F10,
        "F11" => Code::F11,
        "F12" => Code::F12,
        "SPACE" => Code::Space,
        "ENTER" => Code::Enter,
        "TAB" => Code::Tab,
        "ESCAPE" | "ESC" => Code::Escape,
        "BACKSPACE" => Code::Backspace,
        "DELETE" => Code::Delete,
        "UP" => Code::ArrowUp,
        "DOWN" => Code::ArrowDown,
        "LEFT" => Code::ArrowLeft,
        "RIGHT" => Code::ArrowRight,
        _ => Code::KeyV,  // Default to V
    }
}

const DEFAULT_PROMPT: &str = r#"你是一个代码助手。用户会输入一段粗糙的想法或需求，请将其转化为清晰、具体、可执行的任务描述。

要求：
1. 清晰描述要做什么（不是怎么做）
2. 列出具体的步骤（如果复杂）
3. 标注可能的难点或需要注意的地方
4. 保持简洁，用 Bullet Point

直接输出结果，不要加任何前缀或解释。"#;

const MAX_HISTORY_COUNT: usize = 1000;
const MAX_HISTORY_DAYS: i64 = 30;

pub struct AppState {
    pub db: Mutex<Connection>,
}

fn get_config_path(app: &AppHandle) -> PathBuf {
    let app_dir = app.path().app_config_dir().unwrap_or_else(|_| PathBuf::from("."));
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("config.json")
}

fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app.path().app_config_dir().unwrap_or_else(|_| PathBuf::from("."));
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("history.db")
}

fn init_db(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            input TEXT NOT NULL,
            output TEXT NOT NULL,
            template_name TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            favorite INTEGER NOT NULL DEFAULT 0
        )",
        [],
    )?;
    
    // Create index for faster queries
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC)",
        [],
    )?;
    
    // Add favorite column if it doesn't exist (for existing databases)
    conn.execute(
        "ALTER TABLE history ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0",
        [],
    ).ok(); // Ignore error if column already exists
    
    Ok(())
}

fn cleanup_old_history(conn: &Connection) -> SqlResult<()> {
    // Delete records older than MAX_HISTORY_DAYS
    let cutoff = chrono_timestamp() - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
    conn.execute("DELETE FROM history WHERE timestamp < ?", [cutoff])?;
    
    // Keep only the most recent MAX_HISTORY_COUNT records
    conn.execute(
        "DELETE FROM history WHERE id NOT IN (
            SELECT id FROM history ORDER BY timestamp DESC LIMIT ?
        )",
        [MAX_HISTORY_COUNT as i64],
    )?;
    
    Ok(())
}

fn chrono_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

#[tauri::command]
async fn load_config(app: AppHandle) -> Result<AppConfig, String> {
    info!("Loading config from: {:?}", get_config_path(&app));
    load_config_inner(&app)
}

#[tauri::command]
async fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = get_config_path(&app);
    info!("Saving config to: {:?}", path);

    // Acquire file lock (Unix-only)
    #[cfg(unix)]
    {
        use std::os::unix::io::AsRawFd;

        let lock_path = path.with_extension("lock");
        let lock_file = fs::OpenOptions::new()
            .create(true)
            .write(true)
            .open(&lock_path)
            .map_err(|e| format!("无法创建锁文件: {}", e))?;

        flock(
            lock_file.as_raw_fd(),
            FlockArg::LockExclusive,
        ).map_err(|e| format!("无法锁定配置: {}", e))?;
    }

    // Write to temp file then rename (atomic on POSIX, falls back on Windows)
    let temp_path = path.with_extension("tmp");
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&temp_path, &content).map_err(|e| format!("写入临时文件失败: {}", e))?;

    std::fs::rename(&temp_path, &path).map_err(|e| format!("原子替换失败: {}", e))?;

    info!("Config saved successfully");
    Ok(())
}

#[tauri::command]
async fn add_history(
    app: AppHandle,
    state: State<'_, AppState>,
    input: String,
    #[allow(non_snake_case)]
    outputPreview: String, // Only store preview, not full output
    #[allow(non_snake_case)]
    templateName: String,
) -> Result<HistoryItem, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let timestamp = chrono_timestamp();

    conn.execute(
        "INSERT INTO history (input, output, template_name, timestamp, favorite) VALUES (?, ?, ?, ?, 0)",
        rusqlite::params![input, truncate_output(&outputPreview), templateName, timestamp],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // Cleanup old records
    cleanup_old_history(&conn).ok();

    info!("Added history item: id={}", id);

    // Emit event to notify UI to refresh history
    app.emit("history-updated", ()).ok();

    Ok(HistoryItem {
        id,
        input: input.clone(),
        output_preview: truncate_output(&outputPreview),
        template_name: templateName,
        timestamp,
        favorite: false,
    })
}

#[tauri::command]
async fn get_history(state: State<'_, AppState>, limit: Option<usize>) -> Result<Vec<HistoryItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);

    let mut stmt = conn
        .prepare("SELECT id, input, output, template_name, timestamp, favorite FROM history ORDER BY timestamp DESC LIMIT ?")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([limit as i64], |row| {
            let input: String = row.get(1)?;
            let output_preview: String = row.get(2)?;
            Ok(HistoryItem {
                id: row.get(0)?,
                input,
                output_preview,
                template_name: row.get(3)?,
                timestamp: row.get(4)?,
                favorite: row.get::<_, i64>(5)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let items: Vec<HistoryItem> = rows.filter_map(|r| r.ok()).collect();
    Ok(items)
}

#[tauri::command]
async fn delete_history_item(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM history WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    info!("Deleted history item: id={}", id);
    Ok(())
}

#[tauri::command]
async fn toggle_history_favorite(state: State<'_, AppState>, id: i64) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    // Get current favorite status
    let current: i64 = conn.query_row(
        "SELECT favorite FROM history WHERE id = ?",
        [id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    let new_value = if current == 0 { 1 } else { 0 };
    
    conn.execute(
        "UPDATE history SET favorite = ? WHERE id = ?",
        rusqlite::params![new_value, id],
    ).map_err(|e| e.to_string())?;
    
    info!("Toggled history item favorite: id={}, new_value={}", id, new_value);
    Ok(new_value != 0)
}

#[tauri::command]
async fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM history", [])
        .map_err(|e| e.to_string())?;
    info!("Cleared all history");
    Ok(())
}

/// Get backend instance from app config — encapsulates config loading + backend creation
fn get_backend(app: &AppHandle) -> Result<(Box<dyn ai_backend::AIBackend>, String), String> {
    let config = load_config_inner(app)?;
    let selected_id = config.backend.selected_profile_id.clone();

    let backend = create_backend(&selected_id, &config.backend)
        .map_err(|e| e.to_string())?;

    let profile_name = config.backend.profiles.iter()
        .find(|p| p.id == selected_id)
        .map(|p| p.name.clone())
        .unwrap_or_else(|| "unknown".to_string());

    Ok((backend, profile_name))
}

#[tauri::command]
async fn transform_text(app: AppHandle, text: String, system_prompt: String) -> Result<String, String> {
    let start = std::time::Instant::now();

    let (backend, backend_name) = get_backend(&app)?;

    info!("[{}] Request start", backend_name);

    let result = tokio::time::timeout(
        std::time::Duration::from_secs(60),
        backend.transform(&text, &system_prompt)
    ).await;

    let latency_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(Ok(content)) => {
            info!("[{}] Success: {}ms, output_len={}", backend.name(), latency_ms, content.len());
            Ok(content)
        }
        Ok(Err(AIError::RateLimit)) => {
            warn!("[{}] Rate limit after {}ms", backend.name(), latency_ms);
            Err("请求频率超限，请稍后重试".to_string())
        }
        Ok(Err(AIError::Auth(msg))) => {
            error!("[{}] Auth error after {}ms: {}", backend.name(), latency_ms, msg);
            Err("认证失败，请检查 API Key 是否正确".to_string())
        }
        Ok(Err(AIError::Network(msg))) => {
            error!("[{}] Network error after {}ms: {}", backend.name(), latency_ms, msg);
            Err(format!("网络错误: {}", msg))
        }
        Ok(Err(e)) => {
            error!("[{}] Error after {}ms: {}", backend.name(), latency_ms, e);
            Err(e.to_string())
        }
        Err(_) => {
            error!("[{}] Timeout after {}ms", backend.name(), latency_ms);
            Err("AI 处理超时，请重试".to_string())
        }
    }
}

/// Internal config loader (non-command, for use within other commands)
fn load_config_inner(app: &AppHandle) -> Result<AppConfig, String> {
    let path = get_config_path(app);
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let mut config: AppConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;

        // Validate and fill defaults
        let defaults = AppConfig::default();

        // Migration: set version if missing (defaults to 0)
        if config.version == 0 {
            config.version = 1;
        }

        if config.templates.is_empty() {
            config.templates = defaults.templates;
        }
        if config.selected_template_id.is_empty() {
            config.selected_template_id = defaults.selected_template_id;
        }
        if config.output_mode.is_empty() {
            config.output_mode = defaults.output_mode;
        }
        // Use backend from config, or default if not present
        let default_backend = ai_backend::BackendConfig::default();
        if config.backend.profiles.is_empty() && config.backend.selected_profile_id.is_empty() {
            // Try to migrate from old backends format or use defaults
            config.backend = default_backend;
        }

        Ok(config)
    } else {
        Ok(AppConfig::default())
    }
}

#[tauri::command]
async fn get_shortcut(app: AppHandle) -> Result<ShortcutConfig, String> {
    let config = load_config_inner(&app)?;
    Ok(config.shortcut)
}

#[tauri::command]
async fn try_register_shortcut(
    app: AppHandle,
    modifiers: Vec<String>,
    key: String,
) -> Result<(), String> {
    let shortcut = parse_shortcut(&modifiers, &key);
    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, setup_shortcut_callback(app_handle))
        .map_err(|e| format!("注册快捷键失败: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn save_shortcut(
    app: AppHandle,
    modifiers: Vec<String>,
    key: String,
) -> Result<(), String> {
    // Save to config first - if registration fails later, config will be correct for next restart
    let mut config = load_config_inner(&app)?;
    config.shortcut = ShortcutConfig {
        modifiers: modifiers.clone(),
        key: key.clone(),
    };
    save_config(app.clone(), config).await?;

    // Unregister all existing shortcuts
    app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;

    // Register the new shortcut
    let shortcut = parse_shortcut(&modifiers, &key);
    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, setup_shortcut_callback(app_handle))
        .map_err(|e| format!("注册快捷键失败: {}", e))?;

    info!("Shortcut saved and registered successfully");
    Ok(())
}

#[tauri::command]
async fn get_default_prompt() -> String {
    DEFAULT_PROMPT.to_string()
}

#[tauri::command]
async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    info!("Opening settings window");

    // Check if settings window already exists
    if let Some(window) = app.get_webview_window("settings") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new settings window
    let settings_window = tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("index.html".into())
    )
    .title("VibeBubble 设置")
    .inner_size(560.0, 600.0)
    .center()
    .resizable(false)
    .build()
    .map_err(|e| e.to_string())?;

    settings_window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .build(),
        )
        .setup(|app| {
            info!("VibeBubble starting up...");

            // Initialize SQLite database
            let db_path = get_db_path(app.handle());
            info!("Database path: {:?}", db_path);
            
            let conn = Connection::open(&db_path).expect("Failed to open database");
            conn.busy_timeout(Duration::from_secs(5)).expect("Failed to set busy timeout");
            init_db(&conn).expect("Failed to initialize database");
            
            // Store state
            app.manage(AppState {
                db: Mutex::new(conn),
            });

            // Create tray menu
            let show_item = MenuItem::with_id(app, "show", "Show Bubble", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Build tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("VibeBubble")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Register global shortcut from config
            let config = load_config_inner(app.handle())?;
            let shortcut = parse_shortcut(&config.shortcut.modifiers, &config.shortcut.key);
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, setup_shortcut_callback(app_handle))?;
            info!("Global shortcut registered from config");

            // Hide window when it loses focus
            let main_window = app.get_webview_window("main").unwrap();
            main_window.on_window_event({
                let win = main_window.clone();
                move |event| {
                    if let WindowEvent::Focused(false) = event {
                        let _ = win.hide();
                    }
                }
            });

            info!("VibeBubble initialized successfully!");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            transform_text,
            load_config,
            save_config,
            get_default_prompt,
            open_settings_window,
            add_history,
            get_history,
            delete_history_item,
            clear_history,
            toggle_history_favorite,
            get_shortcut,
            try_register_shortcut,
            save_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
