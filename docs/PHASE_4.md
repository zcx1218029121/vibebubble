# Phase 4: 集成 HistoryList 组件

## 目标
评估并集成 `HistoryList.tsx` 组件，消除内联的历史记录实现。

## 风险
🟢 低 - 删除未使用代码

## 当前状态

- `HistoryList.tsx` 存在且功能完整（200+ 行）
- App.tsx 中已移除导入
- 内联实现了类似功能

## 决策点

### 情况 A: HistoryList 功能完整

如果 `HistoryList.tsx` 功能完整且与内联实现等价：
1. 删除 App.tsx/SettingsContent.tsx 中的内联历史列表 UI
2. 使用 `<HistoryList />` 组件统一渲染

### 情况 B: HistoryList 功能缺失

如果 `HistoryList.tsx` 功能不完整或与需求不符：
1. 删除 `HistoryList.tsx`
2. 保留内联实现

## 检查清单

- [ ] HistoryList 支持 `compact` mode 吗？
- [ ] HistoryList 支持详情 modal 吗？
- [ ] HistoryList 支持复制/删除操作吗？
- [ ] HistoryList 与 useHistory hook 集成顺畅吗？

## 验证

```bash
npm run build
```

测试：
- 历史记录列表显示正确
- 复制功能正常
- 删除功能正常
- 清空功能正常

## 执行时间
10 分钟
