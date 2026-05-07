# Phase 2: 重构 SettingsContent 使用 Hooks

## 目标
将 `SettingsContent` 内的内联 state 替换为 `useConfig`、`useHistory`、`useToast` hook 调用。

## 风险
🟡 中 - 涉及状态管理重构

## 修改文件
- `src/App.tsx` - 重构 SettingsContent 函数
- `src/hooks/useToast.ts` - 可能需要补充

## 当前问题代码

```tsx
function SettingsContent() {
  // 重复的 state
  const [config, setConfig] = useState<AppConfig>({...});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  
  // 重复的函数
  const loadConfig = async () => {...};
  const saveConfig = async () => {...};
  const loadHistory = async () => {...};
  const showToast = (msg: string) => {...};
  
  // ...
}
```

## 目标代码

```tsx
function SettingsContent() {
  // 使用 hooks
  const { config, setConfig, loadConfig, saveConfig } = useConfig();
  const { history, loadHistory, deleteHistoryItem, clearHistory } = useHistory();
  const { toast, showToast, hideToast } = useToast();
  
  // ...
}
```

## 可能的问题

### 1. useToast hook 不完整

当前 `useToast.ts`：
```tsx
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };
  // 缺少 hideToast
}
```

需要添加 `hideToast` 函数。

### 2. useHistory 的 loadHistory 可能需要调整

当前 `useHistory` 的 `loadHistory` 加载 100 条限制：
```tsx
const items = await invoke<HistoryItem[]>("get_history", { limit: 100 });
```

SettingsContent 也需要同样的功能，应该直接使用 hook。

## 验证

```bash
npm run build
```

预期：
- 无 TypeScript 错误
- 设置保存/加载功能正常
- Toast 提示正常

## 执行时间
15 分钟
