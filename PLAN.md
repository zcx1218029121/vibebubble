# VibeBubble 开发计划

> 基于 Code Review (2026-05-07) 的分阶段实现计划

---

## 当前状态

- **版本**: v0.5.0
- **已实现**: 核心流程跑通（呼出 → 输入 → 转换 → 复制）
- **完成度**: SPEC.md 功能的 ~40%
- **主要风险**: SQLite 并发必崩、多后端是假实现

---

## 技术债务清理（Phase 0）

> 修复当前版本的明确 Bug，不引入新功能

### 0.1 🔴 SQLite 并发写 Bug
**问题**: `Connection::open()` 没有设 `busy_timeout`，快速连续两次转换必崩
**修复**:
```rust
let conn = Connection::open(&db_path)?;
conn.busy_timeout(Duration::from_secs(5))?;
```

### 0.2 🔴 transform_text 无 Timeout
**问题**: `mmx` 卡住时进程永久 block
**修复**: 用 `std::process::Command` + `tokio::process::Command` 的 timeout 机制，或用 `wait_timeout` crate

### 0.3 🔴 假多后端 UI
**问题**: 设置里有 OpenAI/Claude/Ollama 下拉选项但全是 disabled，实际只调 mmx
**修复**: 把 disabled 选项删干净，只留 "MiniMax (mmx CLI)"，后续 Phase 1 再加回

### 0.4 🟡 配置加载无校验
**问题**: `load_config` 失败后粗暴 fallback，可能丢用户自定义模板
**修复**: 加载后做 schema 校验，字段缺失时做合并而不是全量替换

---

## 多后端架构（Phase 1）

> 实现真正的多 AI 后端支持

### 1.1 AI Backend 抽象层

在 Rust 层定义 `AIBackend` trait：

```rust
trait AIBackend {
    async fn transform(&self, text: &str, system_prompt: &str) -> Result<String, AIError>;
    fn name(&self) -> &str;
}

enum AIError {
    Network(String),
    Auth(String),
    RateLimit,
    Timeout,
    Unknown(String),
}
```

### 1.2 后端实现

| 后端 | 实现方式 | 优先级 |
|------|---------|-------|
| MiniMax (mmx CLI) | `mmx text chat --system ...` | ✅ 已实现，重构进 trait |
| OpenAI | REST API (reqwest) | P1 |
| Claude | REST API (reqwest) | P1 |
| Ollama | REST API (reqwest) | P2 |

### 1.3 Backend Router

`transform_text` command 根据 `selected_backend` 配置选择实际后端：

```rust
async fn transform_text(text: String, system_prompt: String, backend: String) -> Result<String, String> {
    let backend = match backend.as_str() {
        "minimax" => MiniMaxBackend::new(),
        "openai" => OpenAIBackend::new(&api_key)?,
        "claude" => ClaudeBackend::new(&api_key)?,
        "ollama" => OllamaBackend::new(&host)?,
        _ => return Err("未知后端".to_string()),
    };
    backend.transform(&text, &system_prompt).await
}
```

### 1.4 API Key 安全存储

**不要**放在 `config.json` 明文。选项：
- macOS: Keychain（推荐，用 `security` crate）
- Windows: Credential Manager
- 临时方案: env var 注入

---

## 功能补全（Phase 2）

### 2.1 自动粘贴（Auto-Paste）
- 转换完成后复制到剪贴板
- 模拟 `Cmd+V` 粘贴到上一个焦点窗口
- Tauri: 用 `tauri-plugin-clipboard-manager` 读，写用 JS `document.execCommand('paste')` 在隐藏 textarea 上触发

### 2.2 开机启动
- macOS: LaunchAgent（写入 `~/Library/LaunchAgents/`)
- Windows: Registry `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- Linux: `.desktop` file in `~/.config/autostart/`

### 2.3 窗口拖拽
- 当前窗口固定中央
- 实现 Tauri window drag，让用户可以拖动气泡到习惯的位置

### 2.4 快捷键配置 UI
- 从硬编码 `Cmd+Shift+V` 改成设置面板可改
- 存到 `config.json` 的 `trigger.hotkey`
- 动态 `unregister` / `register` 全局快捷键

---

## 用户体验（Phase 3）

### 3.1 Zustand 迁移
当前 12+ 个 useState 难以维护。迁移到 Zustand：

```typescript
// stores/configStore.ts
interface ConfigStore {
  templates: PromptTemplate[];
  selectedTemplateId: string;
  outputMode: 'clipboard' | 'manual';
  selectedBackend: string;
  // actions
  setTemplate: (id: string) => void;
  addTemplate: (t: PromptTemplate) => void;
  // ...
}
```

### 3.2 历史记录增强
- [ ] 搜索过滤
- [ ] 按模板/后端筛选
- [ ] 批量删除
- [ ] 导出为 Markdown

### 3.3 更好的错误反馈
- 网络超时 / Token 过期 / 配额超限 区分显示
- 前端 toast 通知（非 alert）
- 重试机制（自动重试 1 次）

---

## SPEC 同步（Phase 4）

> 修/删 SPEC.md 中未实现的功能描述，避免误导

| SPEC 写的 | 行动 |
|-----------|------|
| 多 AI 后端 | Phase 1 实现后更新为已实现 |
| 自动粘贴 | Phase 2.1 实现 |
| 开机启动 | Phase 2.2 实现 |
| 拖拽窗口 | Phase 2.3 实现 |
| 快捷键配置 UI | Phase 2.4 实现 |
| 右键菜单子菜单 | 评估，低优先级 |
| Zustand | Phase 3.1 实现后补充 |
| shadcn/ui | 评估，v1.0 前决定 |

---

## 发布计划

| 版本 | 里程碑 | 目标 |
|------|--------|------|
| v0.6.0 | Phase 0 完成，Bug 修复 | 2026-05 |
| v0.7.0 | Phase 1 完成，真多后端 | 2026-05 |
| v0.8.0 | Phase 2 完成，功能补全 | 2026-06 |
| v1.0.0 | Phase 3+4 完成，正式发布 | 2026-06 |

---

## 依赖更新检查清单

```
Rust:
  [x] tauri 2.x
  [x] tauri-plugin-global-shortcut 2.x
  [x] tauri-plugin-clipboard-manager 2.x
  [x] rusqlite 0.32 (bundled)
  [ ] reqwest (Phase 1 多后端需要)
  [ ] tokio (async timeout)
  [ ] security (macOS Keychain, P1)

前端:
  [x] React 19
  [x] Tailwind CSS 4
  [x] Vite 7
  [ ] zustand (Phase 3)
  [ ] sonner (toast 通知, Phase 3)
  [ ] @tanstack/react-query (可选, Phase 3)
```

---

## 执行顺序

```
Week 1:
  → Phase 0.1 SQLite busy_timeout
  → Phase 0.2 transform_text timeout
  → Phase 0.3 清理假多后端 UI

Week 2:
  → Phase 1.1 AI Backend trait 设计
  → Phase 1.2 MiniMax 重构进 trait
  → Phase 1.2 OpenAI 后端实现

Week 3:
  → Phase 1.2 Claude + Ollama 后端
  → Phase 1.4 API Key 安全存储方案
  → Phase 3.1 Zustand 迁移

Week 4:
  → Phase 2.1 Auto-paste
  → Phase 2.2 开机启动
  → Phase 2.3 窗口拖拽
  → Phase 2.4 快捷键配置

Week 5:
  → Phase 3.2 历史增强
  → Phase 3.3 错误反馈
  → Phase 4 SPEC 同步

Week 6:
  → v1.0.0 发布准备
  → GitHub Release
  → 构建验证（Mac/Windows/Linux）
```
