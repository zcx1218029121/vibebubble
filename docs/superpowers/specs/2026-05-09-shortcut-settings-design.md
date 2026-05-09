# Shortcut Settings Design

## Problem Statement

Users need to customize the global shortcut that triggers the VibeBubble bubble. Currently it is hardcoded as Cmd+Shift+V with no UI to change it.

## Solution

Add a shortcut settings UI in the General tab of Settings window where users can:
1. Capture their desired key combination
2. Test if it works (register attempt)
3. Apply and persist the setting

## Data Model

### Config Schema Change

```rust
// lib.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShortcutConfig {
    pub modifiers: Vec<String>,  // "meta", "ctrl", "alt", "shift"
    pub key: String,           // "v", "a", "F1", etc.
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub version: u32,
    pub templates: Vec<PromptTemplate>,
    pub selected_template_id: String,
    pub output_mode: String,
    pub backend: ai_backend::BackendConfig,
    pub shortcut: ShortcutConfig,  // NEW
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            // ... existing fields
            shortcut: ShortcutConfig {
                modifiers: vec!["meta".to_string(), "shift".to_string()],
                key: "v".to_string(),
            },
        }
    }
}
```

### Frontend Type

```typescript
// types.ts
export interface ShortcutConfig {
  modifiers: string[];  // "meta", "ctrl", "alt", "shift"
  key: string;
}
```

## User Flow

### Capturing Shortcut
1. User clicks shortcut input field
2. Input gains focus, shows "按下快捷键..."
3. User presses key combination (e.g., Ctrl+Shift+Space)
4. Frontend captures event and displays readable form: "⌃⇧Space"

### Testing Registration
1. User clicks "测试" button
2. Frontend calls `try_register_shortcut(modifiers, key)` backend command
3. Backend attempts `global_shortcut.register()`
4. If success: Button shows green "✓ 生效"
5. If failure: Button shows red "✗ 冲突"

### Applying
1. User clicks "应用" button
2. Same as test, but on success:
   - Save shortcut to config.json
   - Button shows green "✓ 已保存"
3. On failure:
   - Button shows red "✗ 冲突"
   - Config not updated

## Backend API

### New Commands

```rust
#[tauri::command]
async fn try_register_shortcut(
    app: AppHandle,
    modifiers: Vec<String>,
    key: String,
) -> Result<(), String>

#[tauri::command]
async fn get_shortcut(app: AppHandle) -> Result<ShortcutConfig, String>

#[tauri::command]
async fn save_shortcut(
    app: AppHandle,
    modifiers: Vec<String>,
    key: String,
) -> Result<(), String>
```

### Shortcut Registration Logic

```rust
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

fn code_from_string(key: &str) -> Code {
    // Map "v" -> Code::KeyV, "F1" -> Code::F1, etc.
}
```

### App Startup

On app start, read shortcut from config and register it.

## Frontend Component

### ShortcutInput Component

```tsx
interface ShortcutInputProps {
  value: ShortcutConfig;
  onChange: (config: ShortcutConfig) => void;
  onApply: () => Promise<boolean>;
}

function ShortcutInput({ value, onChange, onApply }: ShortcutInputProps) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [display, setDisplay] = useState('');

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    const modifiers: string[] = [];
    if (e.metaKey) modifiers.push('meta');
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');
    const key = e.key;
    onChange({ modifiers, key });
    setDisplay(formatShortcut(modifiers, key));
  };

  const handleTest = async () => {
    setStatus('testing');
    const ok = await onApply();
    setStatus(ok ? 'success' : 'error');
  };

  return (
    <div className="flex gap-2">
      <input
        value={display || '按下快捷键...'}
        onKeyDown={handleKeyDown}
        className={`flex-1 bg-gray-700 rounded-lg p-2 text-gray-100 ${
          status === 'success' ? 'border-2 border-green-500' :
          status === 'error' ? 'border-2 border-red-500' : ''
        }`}
        readOnly
      />
      <button onClick={handleTest} className={...}>
        {status === 'success' ? '✓ 生效' :
         status === 'error' ? '✗ 冲突' : '测试'}
      </button>
    </div>
  );
}
```

### Modifier Display Format

| Modifier | Symbol |
|----------|--------|
| meta/cmd | ⌘ |
| ctrl | ⌃ |
| alt | ⌥ |
| shift | ⇧ |

## UI Placement

Settings → General tab, add "快捷键" row:

```
快捷键    [⌘⇧V] [测试]    呼出气泡
```

## Error Handling

- Registration fails → Show "冲突" in red, don't save
- Registration succeeds → Show "生效" in green, save config
- Invalid key (can't parse) → Show "无效按键" in red
- Shortcut already registered by another app → System handles this via register() failure

## Out of Scope

- Local shortcuts (only global)
- Multiple shortcuts for different actions
- Shortcut conflict detection before user presses key

## Testing

1. Change shortcut → test button → verify registration
2. Apply shortcut → restart app → verify persisted
3. Set conflicting shortcut → verify error shown
4. Press captured shortcut → verify bubble shows
