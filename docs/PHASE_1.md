# Phase 1: 消除重复代码

## 目标
删除 `SettingsContent` 内重复的 `formatTime` 函数定义，统一使用 `utils.ts` 的版本。

## 风险
🟢 低 - 仅删除代码，无功能变更

## 修改文件
- `src/App.tsx`

## 具体修改

### 1. 删除 formatTime 重复定义

在 `SettingsContent` 函数内删除以下代码（约15行）：

```tsx
// 删除这段：
const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
};
```

## 验证

```bash
npm run build
```

预期：无编译错误

## 执行时间
5 分钟
