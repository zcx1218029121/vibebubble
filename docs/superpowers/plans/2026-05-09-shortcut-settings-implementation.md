# Shortcut Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add UI in Settings → General tab to customize the global shortcut that triggers the VibeBubble bubble (currently hardcoded as Cmd+Shift+V).

**Architecture:** Add ShortcutConfig to AppConfig, expose Tauri commands for shortcut registration (try/test/save), create ShortcutInput React component for key capture and display, wire up to existing global_shortcut plugin.

**Tech Stack:** Tauri v2, tauri-plugin-global-shortcut, React/TypeScript

---

## Task 1: Add ShortcutConfig to Rust AppConfig

**Files:**
- Modify: `src-tauri/src/lib.rs:28-56` — Add ShortcutConfig struct and integrate into AppConfig

- [ ] **Step 1: Add ShortcutConfig struct after HistoryItem (around line 68)**

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShortcutConfig {
    pub modifiers: Vec<String>,  // "meta", "ctrl", "alt", "shift"
    pub key: String,             // "v", "a", "F1", etc.
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            modifiers: vec!["meta".to_string(), "shift".to_string()],
            key: "v".to_string(),
        }
    }
}
```

- [ ] **Step 2: Add shortcut field to AppConfig (line 38)**

```rust
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
    pub shortcut: ShortcutConfig,  // NEW
}
```

- [ ] **Step 3: Initialize shortcut in AppConfig::default() (line 54)**

```rust
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
            shortcut: ShortcutConfig::default(),  // NEW
        }
    }
}
```

- [ ] **Step 4: Run cargo check to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add ShortcutConfig to AppConfig"
```

---

## Task 2: Add Helper Functions for Shortcut Parsing

**Files:**
- Modify: `src-tauri/src/lib.rs` — Add parse_shortcut() and code_from_string() functions

- [ ] **Step 1: Add helper functions after truncate_output() (around line 79)**

```rust
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};

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
```

- [ ] **Step 2: Run cargo check to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add shortcut parsing helpers"
```

---

## Task 3: Add Tauri Commands for Shortcut Management

**Files:**
- Modify: `src-tauri/src/lib.rs` — Add try_register_shortcut, get_shortcut, save_shortcut commands

- [ ] **Step 1: Add get_shortcut command after load_config_inner() (around line 359)**

```rust
#[tauri::command]
async fn get_shortcut(app: AppHandle) -> Result<ShortcutConfig, String> {
    let config = load_config_inner(&app)?;
    Ok(config.shortcut)
}
```

- [ ] **Step 2: Add try_register_shortcut command (after get_shortcut)**

```rust
#[tauri::command]
async fn try_register_shortcut(
    app: AppHandle,
    modifiers: Vec<String>,
    key: String,
) -> Result<(), String> {
    let shortcut = parse_shortcut(&modifiers, &key);
    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                info!("Global shortcut triggered!");
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .map_err(|e| format!("注册快捷键失败: {}", e))?;

    Ok(())
}
```

- [ ] **Step 3: Add save_shortcut command (after try_register_shortcut)**

```rust
#[tauri::command]
async fn save_shortcut(
    app: AppHandle,
    modifiers: Vec<String>,
    key: String,
) -> Result<(), String> {
    // First unregister all existing shortcuts
    app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;

    // Register the new shortcut
    let shortcut = parse_shortcut(&modifiers, &key);
    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                info!("Global shortcut triggered!");
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .map_err(|e| format!("注册快捷键失败: {}", e))?;

    // Save to config
    let mut config = load_config_inner(&app)?;
    config.shortcut = ShortcutConfig {
        modifiers,
        key,
    };
    save_config(app, config).await?;

    info!("Shortcut saved and registered successfully");
    Ok(())
}
```

- [ ] **Step 4: Add commands to invoke_handler (line 489)**

```rust
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
    get_shortcut,           // NEW
    try_register_shortcut,  // NEW
    save_shortcut,          // NEW
])
```

- [ ] **Step 5: Run cargo check to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add shortcut management Tauri commands"
```

---

## Task 4: Refactor Startup Shortcut Registration

**Files:**
- Modify: `src-tauri/src/lib.rs` — Read shortcut from config at startup instead of hardcoding

- [ ] **Step 1: Replace hardcoded shortcut registration in setup() with config-based registration (around line 461-473)**

Find:
```rust
// Register global shortcut Cmd+Shift+V
let shortcut = Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyV);
let app_handle = app.handle().clone();
app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
    if event.state == ShortcutState::Pressed {
        info!("Global shortcut triggered!");
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
})?;
info!("Global shortcut registered: Cmd+Shift+V");
```

Replace with:
```rust
// Register global shortcut from config
let config = load_config_inner(app.handle())?;
let shortcut = parse_shortcut(&config.shortcut.modifiers, &config.shortcut.key);
let app_handle = app.handle().clone();
app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
    if event.state == ShortcutState::Pressed {
        info!("Global shortcut triggered!");
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
})?;
info!("Global shortcut registered from config");
```

- [ ] **Step 2: Run cargo check to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "refactor: read shortcut from config at startup"
```

---

## Task 5: Add ShortcutConfig TypeScript Interface

**Files:**
- Modify: `src/types.ts:46-52` — Add ShortcutConfig interface

- [ ] **Step 1: Add ShortcutConfig interface after BackendConfig**

```typescript
export interface ShortcutConfig {
  modifiers: string[];  // "meta", "ctrl", "alt", "shift"
  key: string;
}
```

- [ ] **Step 2: Add shortcut field to AppConfig**

```typescript
export interface AppConfig {
  templates: PromptTemplate[];
  selected_template_id: string;
  output_mode: string;
  backend: BackendConfig;
  shortcut: ShortcutConfig;  // NEW
}
```

- [ ] **Step 3: Add DEFAULT_SHORTCUT constant**

```typescript
export const DEFAULT_SHORTCUT: ShortcutConfig = {
  modifiers: ["meta", "shift"],
  key: "v",
};
```

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add ShortcutConfig TypeScript interface"
```

---

## Task 6: Create ShortcutInput Component

**Files:**
- Create: `src/components/ShortcutInput.tsx` — New component for key capture

- [ ] **Step 1: Create ShortcutInput component**

```tsx
import { useState, useEffect } from "react";
import type { ShortcutConfig } from "../types";
import { invoke } from "@tauri-apps/api/core";

interface ShortcutInputProps {
  value: ShortcutConfig;
  onChange: (config: ShortcutConfig) => void;
}

const MODIFIER_SYMBOLS: Record<string, string> = {
  meta: "⌘",
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
};

function formatShortcut(config: ShortcutConfig): string {
  const parts = config.modifiers.map((m) => MODIFIER_SYMBOLS[m] || m);
  parts.push(config.key.toUpperCase());
  return parts.join("");
}

type Status = "idle" | "testing" | "success" | "error";

export function ShortcutInput({ value, onChange }: ShortcutInputProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [display, setDisplay] = useState("");

  useEffect(() => {
    setDisplay(formatShortcut(value));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();

    // Ignore if no modifiers
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      return;
    }

    const modifiers: string[] = [];
    if (e.metaKey) modifiers.push("meta");
    if (e.ctrlKey) modifiers.push("ctrl");
    if (e.altKey) modifiers.push("alt");
    if (e.shiftKey) modifiers.push("shift");

    const key = e.key;
    const newConfig = { modifiers, key };
    onChange(newConfig);
    setDisplay(formatShortcut(newConfig));
    setStatus("idle");
  };

  const handleTest = async () => {
    setStatus("testing");
    try {
      await invoke("try_register_shortcut", {
        modifiers: value.modifiers,
        key: value.key,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const handleApply = async () => {
    setStatus("testing");
    try {
      await invoke("save_shortcut", {
        modifiers: value.modifiers,
        key: value.key,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={display || "按下快捷键..."}
        onKeyDown={handleKeyDown}
        readOnly
        placeholder="按下快捷键..."
        className={`flex-1 bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
          status === "success" ? "border-2 border-green-500" : ""
        } ${status === "error" ? "border-2 border-red-500" : ""}`}
      />
      <button
        onClick={handleTest}
        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
          status === "success"
            ? "bg-green-600 text-white"
            : status === "error"
            ? "bg-red-600 text-white"
            : "bg-gray-600 hover:bg-gray-500 text-white"
        }`}
      >
        {status === "success" ? "✓ 生效" : status === "error" ? "✗ 冲突" : "测试"}
      </button>
      <button
        onClick={handleApply}
        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm transition-colors"
      >
        应用
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ShortcutInput.tsx
git commit -m "feat: add ShortcutInput component"
```

---

## Task 7: Integrate ShortcutInput into General Tab

**Files:**
- Modify: `src/SettingsContent.tsx` — Add shortcut row to General tab

- [ ] **Step 1: Import ShortcutInput component**

Add to imports (line 8):
```tsx
import { ShortcutInput } from "./components/ShortcutInput";
```

- [ ] **Step 2: Add shortcut state to SettingsContent**

Find in the component (around line 185):
```tsx
export function SettingsContent() {
  const { config, setConfig, saveConfig } = useConfig();
```

Add after the other useState calls (around line 191):
```tsx
  const [shortcut, setShortcut] = useState(config.shortcut);
```

- [ ] **Step 3: Add shortcut row to General tab (after AI model selector, around line 331)**

Find:
```tsx
              {selectedProfile && (
                <div className="mt-2 text-xs text-gray-400">
                  当前：{selectedProfile.name} · {API_TYPE_LABELS[selectedProfile.api_type]} · {selectedProfile.base_url}
                </div>
              )}
            </div>
```

Add after the closing div of AI model selector:
```tsx
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">快捷键</label>
              <ShortcutInput
                value={shortcut}
                onChange={(config) => setShortcut(config)}
              />
              <div className="mt-1 text-xs text-gray-400">用于呼出气泡窗口</div>
            </div>
```

- [ ] **Step 4: Ensure shortcut is saved to config**

Find the save button handler (around line 332):
```tsx
            <button
              onClick={() => { saveConfig(); showToast("设置已保存"); }}
```

Change to:
```tsx
            <button
              onClick={() => {
                setConfig({ ...config, shortcut });
                saveConfig();
                showToast("设置已保存");
              }}
```

- [ ] **Step 5: Run dev server to verify compilation**

Run: `npm run dev`
Expected: SUCCESS with no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/SettingsContent.tsx
git commit -m "feat: integrate ShortcutInput in General tab"
```

---

## Task 8: Manual Testing

**Files:**
- None (manual verification)

- [ ] **Step 1: Build and run the app**

Run: `npm run tauri dev`
Expected: App starts without errors

- [ ] **Step 2: Test key capture**

1. Open Settings window
2. Go to General tab
3. Click the shortcut input field
4. Press Ctrl+Shift+Space
5. Verify display shows "⌃⇧SPACE"

- [ ] **Step 3: Test registration conflict**

1. Press a shortcut that might conflict (e.g., Cmd+Space on macOS)
2. Verify button shows red "✗ 冲突"

- [ ] **Step 4: Test save and restart**

1. Set a new shortcut (e.g., Ctrl+Alt+V)
2. Click "应用"
3. Verify button shows green "✓ 生效"
4. Restart the app
5. Press the new shortcut
6. Verify bubble appears

- [ ] **Step 5: Test persistence**

1. Set shortcut to something else
2. Close settings without clicking save on main settings button
3. Click main "保存" button
4. Restart app
5. Verify shortcut persisted

---

## Self-Review Checklist

1. **Spec coverage:** All requirements from spec implemented:
   - ShortcutConfig in AppConfig ✓
   - try_register_shortcut command ✓
   - get_shortcut command ✓
   - save_shortcut command ✓
   - Startup registration from config ✓
   - ShortcutInput component ✓
   - UI integration in General tab ✓

2. **Placeholder scan:** No TBD/TODO patterns found ✓

3. **Type consistency:**
   - Rust: ShortcutConfig with modifiers (Vec<String>) and key (String) ✓
   - TypeScript: ShortcutConfig with modifiers (string[]) and key (string) ✓
   - Command signatures match between frontend invoke and backend handlers ✓

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-09-shortcut-settings-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
