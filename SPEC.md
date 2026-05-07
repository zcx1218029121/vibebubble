# VibeBubble - 设计规格书

> 一个跨平台 Vibe Coding 辅助工具，通过全局气泡快速将粗糙想法转化为结构化文字。

## 1. 概念与愿景

VibeBubble 是一个随时可呼出的全局输入气泡，让开发者可以用自然语言描述想法，按下回车后 AI 将其转化为结构化的任务描述、代码注释或任何你想要的格式。它是思维与代码之间的"翻译器"——你想怎么写都行，AI帮你整理成干净的文字。

**核心理念**：输入是 free-form 的，输出是可配置的，结果是即时可用的。

---

## 2. 技术栈

| 组件 | 技术选型 | 理由 |
|------|---------|------|
| 框架 | Tauri v2 | 跨平台（Win/Mac/Linux）、轻量（比 Electron 小10x）、Rust 后端性能好 |
| 前端 | React + TypeScript | 成熟生态，组件复用方便 |
| 样式 | Tailwind CSS | 快速原型开发 |
| 状态管理 | Zustand | 轻量、TypeScript 友好 |
| 打包 | Tauri bundler | 一键生成各平台安装包 |

---

## 3. 功能架构

### 3.1 核心功能模块

```
┌─────────────────────────────────────────────────────┐
│                    VibeBubble                        │
├─────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │
│  │  Trigger  │  │  Bubble   │  │   Settings    │  │
│  │  Manager  │  │    UI     │  │    Window     │  │
│  └───────────┘  └───────────┘  └───────────────┘  │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │
│  │    AI     │  │  Output   │  │    History    │  │
│  │  Engine   │  │  Handler  │  │   Manager     │  │
│  └───────────┘  └───────────┘  └───────────────┘  │
│  ┌─────────────────────────────────────────────────┐│
│  │              Config Manager (JSON)              ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 3.2 触发方式（全部可配置）

| 触发方式 | 默认快捷键 | 说明 |
|---------|-----------|------|
| 全局快捷键 | `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Win/Linux) | 全局监听，可在设置中修改 |
| 菜单栏图标点击 | - | 点击菜单栏图标呼出气泡 |
| 状态栏常驻 | - | 状态栏图标随时可用 |

### 3.3 AI 后端（全部可配置）

| 后端 | 配置项 | 说明 |
|------|--------|------|
| 本地 LLM | `ollama host`, `model name` | 支持 Ollama API (http://localhost:11434) |
| MiniMax | `api key`, `model` | MiniMax API（已有配额） |
| OpenAI | `api key`, `model` | OpenAI API (GPT-4o mini 等) |
| Claude | `api key`, `model`, `api version` | Anthropic Claude API |

用户可在设置中切换激活的后端，并配置各后端的 API Key 和参数。

### 3.4 输出方式（全部可配置）

| 模式 | 行为 | 触发条件 |
|------|------|---------|
| 剪贴板 | 结果复制到剪贴板 | 设置中选择"仅复制" |
| 自动粘贴 | 复制到剪贴板 + 模拟 Cmd+V 粘贴到焦点窗口 | 设置中选择"自动粘贴" |
| 气泡显示 | 结果显示在气泡内，可复制可编辑 | 设置中选择"气泡显示" |

### 3.5 结果行为（全部可配置）

| 行为 | 说明 |
|------|------|
| Esc 或点击外部 | 气泡消失（适用于气泡显示模式） |
| 自动发送 | 结果处理完毕后自动执行输出操作，气泡消失 |
| 回车继续 | Enter 发送下一条输入，Esc 消失 |

### 3.6 提示词模板

默认模板 A（想法 → 结构化任务描述）：

```
你是一个代码助手。用户会输入一段粗糙的想法或需求，
请将其转化为清晰、具体、可执行的任务描述。

要求：
1. 清晰描述要做什么（不是怎么做）
2. 列出具体的步骤（如果复杂）
3. 标注可能的难点或需要注意的地方
4. 保持简洁，用 Bullet Point

用户输入：
{user_input}

结构化输出：
```

用户可在设置中：
- 查看/编辑默认模板
- 添加新模板（B、C、D...）
- 删除自定义模板
- 设置默认激活的模板

### 3.7 历史记录

- 所有转换记录自动保存
- 存储内容：输入文本、输出文本、使用的模板、使用的后端、时间戳
- 右键菜单提供"查看历史"入口
- 可搜索、复制历史记录

---

## 4. UI 设计

### 4.1 气泡窗口

```
┌─────────────────────────────────────────┐
│  💭 VibeBubble          [_] [×]         │  ← 标题栏（可拖拽）
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ 输入你的想法...                    │  │  ← 输入区域
│  │                                   │  │    (placeholder)
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [🤖 MiniMax ▼] [📋 剪贴板 ▼] [⚙️]    │  ← 工具栏
│                                         │    - AI 后端选择
│                                         │    - 输出模式选择
│                                         │    - 设置按钮
└─────────────────────────────────────────┘
  ↓ AI 处理中...
┌─────────────────────────────────────────┐
│  ✅ 输出完成                             │
│  ┌───────────────────────────────────┐  │
│  │ • 实现用户登录功能                 │  │  ← 结果显示
│  │ • 使用 JWT 进行身份验证            │  │
│  │ • 密码加密存储                     │  │
│  └───────────────────────────────────┘  │
│           [复制] [重新生成]              │
└─────────────────────────────────────────┘
```

**规格**：
- 宽度：480px（固定）
- 高度：自适应内容，最大 600px
- 圆角：16px
- 背景：毛玻璃效果（Backdrop blur）
- 位置：屏幕中央（可拖拽改变位置）
- 外观：始终在所有窗口之上（Always on top）

### 4.2 设置窗口

通过右键菜单 → "设置" 打开独立窗口。

```
┌─────────────────────────────────────────────────────┐
│  ⚙️ VibeBubble 设置                        [×]     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ [触发] [AI后端] [输出] [提示词] [外观] [关于]   ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  ┌─ 触发设置 ───────────────────────────────────┐  │
│  │                                                │  │
│  │  全局快捷键:  [Cmd+Shift+V    ] [修改]       │  │
│  │                                                │  │
│  │  ☑ 启用菜单栏图标                             │  │
│  │  ☑ 启用状态栏图标                             │  │
│  │                                                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ 开机启动 ───────────────────────────────────┐  │
│  │                                                │  │
│  │  [●] 开启  (○) 关闭                          │  │
│  │                                                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Tab 页说明**：
- **触发**：快捷键配置、菜单栏/状态栏图标开关
- **AI 后端**：各后端 API Key 配置、默认后端选择
- **输出**：输出模式默认选择、结果行为默认选择
- **提示词**：模板列表、默认模板、添加/编辑/删除
- **外观**：语言（中文/English）、主题（跟随系统/浅色/深色）
- **关于**：版本信息、检查更新

### 4.3 右键菜单

在气泡或状态栏图标上右键：

```
┌─────────────────────┐
│ ✨ 新建转换          │  ← 呼出气泡
├─────────────────────┤
│ 📋 历史记录          │  → 展开子菜单
│   └─ 今天           │
│   └─ 昨天           │
│   └─ 本周           │
├─────────────────────┤
│ ⚙️ 设置              │  ← 打开设置窗口
│ ❓ 帮助              │
├─────────────────────┤
│ 🚪 退出              │
└─────────────────────┘
```

---

## 5. 数据存储

### 5.1 配置文件（JSON）

位置：
- macOS: `~/Library/Application Support/VibeBubble/config.json`
- Windows: `%APPDATA%\VibeBubble\config.json`
- Linux: `~/.config/VibeBubble/config.json`

```json
{
  "version": "1.0.0",
  "trigger": {
    "hotkey": "Cmd+Shift+V",
    "menuBarIconEnabled": true,
    "statusBarIconEnabled": true
  },
  "ai": {
    "activeBackend": "minimax",
    "backends": {
      "local": {
        "enabled": false,
        "host": "http://localhost:11434",
        "model": "llama3"
      },
      "minimax": {
        "enabled": true,
        "apiKey": "***",
        "model": "abab6.5s-chat"
      },
      "openai": {
        "enabled": false,
        "apiKey": "***",
        "model": "gpt-4o-mini"
      },
      "claude": {
        "enabled": false,
        "apiKey": "***",
        "model": "claude-3-haiku"
      }
    }
  },
  "output": {
    "defaultMode": "clipboard",
    "defaultResultBehavior": "autoSend"
  },
  "prompts": {
    "defaultId": "a",
    "templates": {
      "a": {
        "name": "想法→任务",
        "content": "你是一个代码助手...\n\n用户输入：\n{user_input}\n\n结构化输出："
      }
    }
  },
  "general": {
    "autoStart": false,
    "language": "zh-CN",
    "theme": "system"
  }
}
```

### 5.2 历史记录（SQLite）

位置：
- macOS: `~/Library/Application Support/VibeBubble/history.db`
- Windows: `%APPDATA%\VibeBubble\history.db`
- Linux: `~/.config/VibeBubble/history.db`

```sql
CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  prompt_template_id TEXT NOT NULL,
  ai_backend TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_created_at ON history(created_at);
```

---

## 6. 系统集成

| 功能 | 实现方式 | 说明 |
|------|---------|------|
| 全局快捷键 | `tauri-plugin-global-shortcut` | Tauri 官方插件 |
| 系统托盘 | `tauri-plugin-tray` | 状态栏图标 + 右键菜单 |
| 剪贴板 | `tauri-plugin-clipboard` | 读写剪贴板 |
| 自动粘贴 | `tauri-plugin-clipboard` + 输入模拟 | 复制后模拟 Cmd+V |
| 开机启动 | 平台特定方式 | macOS: LaunchAgent, Windows: Registry |
| 窗口管理 | Tauri Window API | 始终顶层、可拖拽 |

---

## 7. 项目结构

```
vibebubble/
├── src/                          # React 前端
│   ├── components/
│   │   ├── Bubble/               # 气泡窗口组件
│   │   ├── Settings/             # 设置窗口组件
│   │   │   ├── TriggerTab.tsx
│   │   │   ├── AIBackendTab.tsx
│   │   │   ├── OutputTab.tsx
│   │   │   ├── PromptTab.tsx
│   │   │   └── AppearanceTab.tsx
│   │   ├── History/              # 历史记录组件
│   │   └── common/               # 通用组件
│   ├── stores/                   # Zustand stores
│   │   ├── configStore.ts
│   │   ├── historyStore.ts
│   │   └── uiStore.ts
│   ├── hooks/                    # 自定义 hooks
│   ├── styles/                   # Tailwind 样式
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── lib.rs                # 库入口
│   │   ├── commands/             # Tauri commands
│   │   │   ├── mod.rs
│   │   │   ├── ai.rs             # AI 调用
│   │   │   ├── config.rs         # 配置读写
│   │   │   ├── history.rs        # 历史记录
│   │   │   └── clipboard.rs      # 剪贴板
│   │   └── tray.rs               # 托盘图标
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── SPEC.md
└── README.md
```

---

## 8. 开发计划

### Phase 1: 核心框架 ⭐
- [ ] Tauri 项目初始化
- [ ] React + Tailwind 前端搭建
- [ ] 气泡窗口基础 UI
- [ ] 托盘图标 + 右键菜单
- [ ] 设置窗口基础框架

### Phase 2: AI 集成 🔥
- [ ] AI 后端抽象层设计
- [ ] MiniMax API 集成
- [ ] 配置化提示词模板
- [ ] AI 调用 + 结果展示

### Phase 3: 输出功能 ✅
- [ ] 剪贴板输出
- [ ] 自动粘贴功能
- [ ] 结果行为配置化

### Phase 4: 增强功能 🎁
- [ ] 全局快捷键
- [ ] 历史记录
- [ ] 多后端支持（OpenAI/Claude/本地）
- [ ] 开机启动配置
- [ ] 多语言支持

---

## 9. 发布计划

| 平台 | 格式 | 目标 |
|------|------|------|
| macOS | `.dmg` / `.app` | v1.0.0 |
| Windows | `.msi` / `.exe` | v1.0.0 |
| Linux | `.AppImage` / `.deb` | v1.0.0 |

---

## 10. 命名

- **项目名**：VibeBubble
- **Slogan**：Vibe in, clean text out.
- **Logo**：💭（气泡+灯泡/想法的组合）
