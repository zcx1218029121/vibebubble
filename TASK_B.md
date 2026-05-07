# Task B: 0.3 假多后端 UI 清理

## 目标
清理 `src/App.tsx` 里 disabled 的假后端下拉选项

---

## Step 1: 找到 AI 后端下拉框

**文件**: `src/App.tsx`

在 `settingsTab === "general"` 的 JSX 里找到这个 select:

```tsx
<select
  value={config.selected_backend}
  onChange={(e) => setConfig({ ...config, selected_backend: e.target.value })}
  className="w-full bg-gray-700 rounded-lg p-2 ..."
>
  <option value="minimax">MiniMax (mmx CLI)</option>
  <option value="openai" disabled>OpenAI (待配置)</option>
  <option value="claude" disabled>Claude (待配置)</option>
  <option value="ollama" disabled>本地 Ollama (待配置)</option>
</select>
```

---

## Step 2: 只保留 minimax

替换为:
```tsx
<select
  value={config.selected_backend}
  onChange={(e) => setConfig({ ...config, selected_backend: e.target.value })}
  className="w-full bg-gray-700 rounded-lg p-2 ..."
>
  <option value="minimax">MiniMax (mmx CLI)</option>
</select>
```

---

## Step 3: 验证

```bash
cd /Users/loaf/workspace/typeme && npx tsc --noEmit 2>&1 | head -30
```

如果没装 tsc，用:
```bash
cd /Users/loaf/workspace/typeme && npm run build 2>&1 | head -30
```

---

## Step 4: 完成后记录

把 "Task B 完成: 0.3 假后端UI清理" 追加到 /Users/loaf/workspace/typeme/PHASE0_STATUS.md
