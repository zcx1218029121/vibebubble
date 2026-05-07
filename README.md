# 💭 VibeBubble

**Vibe Coding 助手** — 一个悬浮在屏幕边缘的 AI 文本转换工具。通过全局快捷键一键呼出，将粗糙的想法、代码、翻译需求快速转化为高质量输出。

macOS 原生应用，基于 Tauri 2.0 + React + Tailwind CSS 构建。

---

## ✨ 功能特性

### 核心功能
- **全局快捷键** — `Cmd+Shift+V` 随时呼出，焦点离开自动隐藏
- **模板化转换** — 选择预设模板或自定义提示词，一键转换
- **AI 驱动** — 支持 MiniMax (mmx CLI)、OpenAI、Claude、本地 Ollama
- **历史记录** — SQLite 持久化存储，保留 1000 条或 30 天

### 内置模板
| 模板 | 用途 |
|------|------|
| 想法→任务 | 将粗糙需求转化为清晰可执行的任务描述 |
| 代码→注释 | 为代码添加有意义的注释（解释 WHY） |
| 翻译润色 | 中英互译，保持语气和风格 |
| 总结摘要 | 长文提取关键要点 |

### 输出模式
- **剪贴板模式** — 转换后自动复制到剪贴板
- **手动模式** — 自己选择复制时机

---

## 🚀 快速开始

### 环境要求
- macOS 12+
- [MiniMax mmx CLI](https://www.minimaxi.com/) (用于 AI 对话)
  ```bash
  # 安装 mmx CLI
  brew install minimax-cli/tap/mmx
  # 配置 API Key
  mmx auth
  ```

### 开发

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run tauri dev
```

### 构建

```bash
# 构建 macOS 应用
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/dmg/`。

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Shift+V` | 全局呼出 VibeBubble |
| `Enter` | 执行转换 |
| `Esc` | 隐藏窗口 |

---

## 🏗️ 技术架构

```
VibeBubble/
├── src/                    # React 前端 (TypeScript + Tailwind)
│   └── App.tsx             # 主组件
├── src-tauri/              # Rust 后端 (Tauri 2.0)
│   ├── src/lib.rs          # 核心逻辑 + Tauri 命令
│   └── tauri.conf.json     # Tauri 配置
└── vite.config.ts         # Vite 构建配置
```

### Rust 后端职责
- SQLite 数据库操作（历史记录）
- 配置文件读写（JSON）
- 全局快捷键注册
- 托盘图标管理
- mmx CLI 调用（AI 转换）

### React 前端职责
- 模板选择与管理
- 用户输入 / AI 输出 UI
- 设置面板
- 历史记录浏览

---

## 📦 数据存储

| 数据 | 路径 |
|------|------|
| 配置文件 | `~/Library/Application Support/com.vibebubble.app/config.json` |
| 历史数据库 | `~/Library/Application Support/com.vibebubble.app/history.db` |
| 日志 | `~/Library/Logs/com.vibebubble.app/` |

---

## 🔧 模板自定义

支持完全自定义提示词模板：

1. 点击 ⚙️ 进入设置
2. 切换到「模板」Tab
3. 添加 / 编辑 / 删除模板
4. 使用 `{user_input}` 占位用户输入

---

## 📝 License

MIT
