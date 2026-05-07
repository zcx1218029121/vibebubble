# Phase 3: 拆分 App.tsx

## 目标
将 App.tsx 拆分为独立组件，简化主文件到 ~80 行。

## 风险
🔴 高 - 大量代码移动，容易遗漏边界情况

## 目标结构

```
src/
├── App.tsx              # 主入口 (~80行)
├── MainWindow.tsx       # 主窗口内容
└── SettingsContent.tsx  # 设置内容（从 SettingsContent 函数重命名）
```

## 拆分步骤

### Step 1: 创建 SettingsContent.tsx

从 `App.tsx` 中的 `SettingsContent` 函数（已重构后）复制到独立文件。

需要保留的 imports：
```tsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, PromptTemplate, HistoryItem } from "./types";
import { PRESET_TEMPLATES, DEFAULT_BACKEND_CONFIG } from "./types";
import { useConfig } from "./hooks/useConfig";
import { useHistory } from "./hooks/useHistory";
import { useToast } from "./hooks/useToast";
import { TemplateEditor } from "./components/TemplateEditor";
```

### Step 2: 创建 MainWindow.tsx

从 `App.tsx` 提取主窗口逻辑（约400行）。

需要保留：
- 输入框
- 转换按钮
- 输出显示
- 快捷键处理

### Step 3: 简化 App.tsx

```tsx
import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MainWindow } from "./MainWindow";
import { SettingsContent } from "./SettingsContent";

function App() {
  const [windowType, setWindowType] = useState<"main" | "settings">("main");
  const configLoaded = useRef(false);

  // Detect window type on mount
  useEffect(() => {
    const detectWindowType = async () => {
      try {
        const win = getCurrentWindow();
        const label = win.label;
        setWindowType(label === "settings" ? "settings" : "main");
      } catch (e) {
        console.error("Failed to detect window type:", e);
      }
    };
    detectWindowType();
  }, []);

  return windowType === "settings" ? <SettingsContent /> : <MainWindow />;
}

export default App;
```

## 需要注意的问题

### 1. 共享状态

如果主窗口和设置窗口需要共享状态（如配置变更后主窗口需要更新），需要通过 Tauri 事件通信：
- 设置保存后 emit `config-updated` 事件
- 主窗口 listen 该事件并 reload

### 2. 组件间 props 传递

如果 SettingsContent 需要被 App.tsx 控制（如 visible prop），通过 props 传递。

### 3. 测试点

- [ ] 主窗口：输入 → 转换 → 复制
- [ ] 设置窗口：修改 API Key → 保存 → 重启生效
- [ ] 窗口切换：主窗口/设置窗口能正确识别

## 验证

```bash
npm run build
```

预期：
- 无 TypeScript 错误
- 两个窗口都能正常渲染

## 执行时间
30 分钟
