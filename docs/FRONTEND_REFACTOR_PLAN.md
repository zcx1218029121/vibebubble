# VibeBubble 前端重构执行计划

## 目标
将 1120 行的 App.tsx 重构为模块化结构，消除重复代码，统一状态管理。

## 问题摘要

| 严重程度 | 问题 | 影响 |
|----------|------|------|
| 🔴 P0 | App.tsx 1120行 | 难以维护 |
| 🔴 P0 | SettingsContent 重复 useState | 状态管理混乱 |
| 🟡 P1 | formatTime 重复定义 | 代码冗余 |
| 🟡 P1 | HistoryList 组件未使用 | 代码冗余 |
| 🟢 P2 | useEffect cleanup 问题 | 潜在内存泄漏 |

## 目标结构

```
src/
├── App.tsx              # 主入口 (~80行)
├── MainWindow.tsx       # 主窗口内容 (~400行)
├── SettingsContent.tsx  # 设置内容 (~700行)
├── components/
│   ├── TemplateEditor.tsx
│   └── HistoryList.tsx
├── hooks/
│   ├── useConfig.ts
│   ├── useHistory.ts
│   ├── useClipboard.ts
│   └── useToast.ts
└── types.ts
```

## 执行阶段

| Phase | 内容 | 风险 | 产出文件 |
|-------|------|------|----------|
| Phase 1 | 消除重复代码 | 🟢 低 | App.tsx (修复后) |
| Phase 2 | 重构 SettingsContent 使用 Hooks | 🟡 中 | SettingsContent.tsx |
| Phase 3 | 拆分 App.tsx | 🔴 高 | MainWindow.tsx, App.tsx |
| Phase 4 | 集成 HistoryList | 🟢 低 | - |

详见各 Phase 文件：
- `PHASE_1.md` - 消除重复代码
- `PHASE_2.md` - 重构 SettingsContent
- `PHASE_3.md` - 拆分 App.tsx
- `PHASE_4.md` - 集成 HistoryList

## 验证方法

```bash
npm run build   # TypeScript 编译
```

**预期结果**：
- App.tsx: 1120行 → ~80行
- TypeScript warnings: 0
- 所有功能正常
