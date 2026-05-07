import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  description: string;
}

interface HistoryItem {
  id: number;
  input: string;
  output: string;
  template_name: string;
  timestamp: number;
}

interface AppConfig {
  templates: PromptTemplate[];
  selected_template_id: string;
  output_mode: string;
  selected_backend: string;
}

const DEFAULT_TEMPLATE: PromptTemplate = {
  id: "default",
  name: "想法→任务",
  description: "将粗糙想法转化为清晰可执行的任务描述",
  prompt: `你是一个代码助手。用户会输入一段粗糙的想法或需求，请将其转化为清晰、具体、可执行的任务描述。

要求：
1. 清晰描述要做什么（不是怎么做）
2. 列出具体的步骤（如果复杂）
3. 标注可能的难点或需要注意的地方
4. 保持简洁，用 Bullet Point

直接输出结果，不要加任何前缀或解释。`,
};

const PRESET_TEMPLATES: PromptTemplate[] = [
  DEFAULT_TEMPLATE,
  {
    id: "code-comment",
    name: "代码→注释",
    description: "给代码添加注释和说明",
    prompt: `你是一个代码注释助手。用户会输入一段代码，请添加清晰、准确的中文注释。

要求：
1. 注释要解释 WHY，不是 WHAT（不要写"这是循环"这种废话）
2. 复杂逻辑要详细解释
3. 标注可能的边界情况和坑
4. 保持简洁，不要过度注释

直接输出带注释的代码，不要加任何前缀。`,
  },
  {
    id: "translate",
    name: "翻译润色",
    description: "将中文翻译成英文或润色英文",
    prompt: `你是一个翻译助手。用户会输入一段中文或英文，请翻译成目标语言并润色。

要求：
1. 保持原文的语气和风格
2. 符合目标语言的表达习惯
3. 专业技术术语保持准确

直接输出翻译结果，不要加任何前缀或解释。`,
  },
  {
    id: "summarize",
    name: "总结摘要",
    description: "将长文本总结为关键要点",
    prompt: `你是一个总结助手。用户会输入一段文字，请提取关键信息并总结。

要求：
1. 提取 3-7 个关键要点
2. 每个要点一句话
3. 按重要性排序
4. 保留原文的核心信息

直接输出总结，不要加任何前缀。`,
  },
];

function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "templates" | "history">("templates");
  const [config, setConfig] = useState<AppConfig>({
    templates: PRESET_TEMPLATES,
    selected_template_id: "default",
    output_mode: "clipboard",
    selected_backend: "minimax",
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState<number | null>(null);
  const configLoaded = useRef(false);

  // Load config and history on mount
  useEffect(() => {
    if (configLoaded.current) return;
    configLoaded.current = true;
    loadConfig();
    loadHistory();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await invoke<AppConfig>("load_config");
      if (cfg.templates && cfg.templates.length > 0) {
        setConfig(cfg);
      } else {
        setConfig({
          ...cfg,
          templates: PRESET_TEMPLATES,
          selected_template_id: cfg.selected_template_id || "default",
        });
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      setConfig({
        templates: PRESET_TEMPLATES,
        selected_template_id: "default",
        output_mode: "clipboard",
        selected_backend: "minimax",
      });
    }
  };

  const loadHistory = async () => {
    try {
      const items = await invoke<HistoryItem[]>("get_history", { limit: 100 });
      setHistory(items);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const saveConfig = async () => {
    try {
      await invoke("save_config", { config });
      setShowSettings(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  };

  const getCurrentTemplate = () => {
    return config.templates.find((t) => t.id === config.selected_template_id) || DEFAULT_TEMPLATE;
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");
    setCopied(false);

    try {
      const template = getCurrentTemplate();
      const result = await invoke<string>("transform_text", {
        text: input,
        systemPrompt: template.prompt,
      });
      setOutput(result);

      // Add to SQLite history
      await invoke<HistoryItem>("add_history", {
        input,
        output: result,
        templateName: template.name,
      });
      
      // Reload history
      await loadHistory();

      if (config.output_mode === "clipboard") {
        await writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      setOutput(`错误: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // History functions
  const deleteHistoryItem = async (id: number) => {
    try {
      await invoke("delete_history_item", { id });
      setHistory(history.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const clearHistory = async () => {
    try {
      await invoke("clear_history");
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  // Template management functions
  const addTemplate = () => {
    const newTemplate: PromptTemplate = {
      id: `template_${Date.now()}`,
      name: "新模板",
      description: "描述这个模板的用途",
      prompt: "输入提示词内容...",
    };
    setEditingTemplate(newTemplate);
    setIsNewTemplate(true);
  };

  const editTemplate = (template: PromptTemplate) => {
    setEditingTemplate({ ...template });
    setIsNewTemplate(false);
  };

  const deleteTemplate = (id: string) => {
    if (config.templates.length <= 1) {
      alert("至少保留一个模板");
      return;
    }
    const newTemplates = config.templates.filter((t) => t.id !== id);
    const newSelectedId =
      config.selected_template_id === id ? newTemplates[0].id : config.selected_template_id;
    setConfig({ ...config, templates: newTemplates, selected_template_id: newSelectedId });
  };

  const saveTemplate = () => {
    if (!editingTemplate) return;

    if (isNewTemplate) {
      setConfig({
        ...config,
        templates: [...config.templates, editingTemplate],
        selected_template_id: editingTemplate.id,
      });
    } else {
      setConfig({
        ...config,
        templates: config.templates.map((t) =>
          t.id === editingTemplate.id ? editingTemplate : t
        ),
      });
    }
    setEditingTemplate(null);
    setIsNewTemplate(false);
  };

  const cancelEditTemplate = () => {
    setEditingTemplate(null);
    setIsNewTemplate(false);
  };

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

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💭</span>
          <span className="font-medium text-gray-200">VibeBubble</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">v0.5.0</span>
          <button
            onClick={() => {
              setSettingsTab("templates");
              setShowSettings(true);
            }}
            className="text-gray-400 hover:text-white transition-colors"
            title="设置"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Template Selector */}
      <div className="mb-3">
        <select
          value={config.selected_template_id}
          onChange={(e) =>
            setConfig({ ...config, selected_template_id: e.target.value })
          }
          className="w-full bg-gray-800 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {config.templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Input Area */}
      <div className="flex-1 flex flex-col">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`输入你的想法，按 Enter 转换...\n当前模板: ${getCurrentTemplate().name}`}
          className="flex-1 w-full bg-gray-800 rounded-xl p-3 text-gray-100 placeholder-gray-500 resize-none outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              AI 转换中...
            </span>
          ) : (
            "✨ 转换"
          )}
        </button>

        {/* Output Area */}
        {output && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                输出结果 {copied && "✅ 已复制到剪贴板"}
              </span>
              <button
                onClick={() => handleCopy(output)}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                📋 复制
              </button>
            </div>
            <div className="w-full h-32 bg-gray-800 rounded-xl p-3 text-gray-100 overflow-y-auto whitespace-pre-wrap">
              {output}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>按 Esc 隐藏</span>
        <span>⚙️ Cmd+Shift+V 呼出</span>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl w-[560px] max-h-[85vh] overflow-hidden flex flex-col">
            {/* Settings Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-medium text-gray-200">⚙️ 设置</h2>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setEditingTemplate(null);
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setSettingsTab("templates")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  settingsTab === "templates"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                📝 模板
              </button>
              <button
                onClick={() => setSettingsTab("history")}
                className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                  settingsTab === "history"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                📜 历史
                {history.length > 0 && (
                  <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">
                    {history.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSettingsTab("general")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  settingsTab === "general"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                ⚡ 通用
              </button>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {settingsTab === "templates" && !editingTemplate && (
                <>
                  {/* Template List */}
                  <div className="space-y-2">
                    {config.templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-3 rounded-lg border ${
                          template.id === config.selected_template_id
                            ? "border-blue-500 bg-gray-700/50"
                            : "border-gray-700 bg-gray-700/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-200">{template.name}</span>
                          <div className="flex items-center gap-1">
                            {template.id === config.selected_template_id && (
                              <span className="text-xs text-blue-400">✓ 使用中</span>
                            )}
                            <button
                              onClick={() => editTemplate(template)}
                              className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => deleteTemplate(template.id)}
                              className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">{template.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Template Button */}
                  <button
                    onClick={addTemplate}
                    className="mt-3 w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
                  >
                    + 添加新模板
                  </button>
                </>
              )}

              {settingsTab === "templates" && editingTemplate && (
                <>
                  {/* Template Edit Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        模板名称
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.name}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, name: e.target.value })
                        }
                        className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="如：想法→任务"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        描述
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.description}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, description: e.target.value })
                        }
                        className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="这个模板的用途"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        提示词内容
                      </label>
                      <textarea
                        value={editingTemplate.prompt}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, prompt: e.target.value })
                        }
                        className="w-full h-48 bg-gray-700 rounded-lg p-3 text-gray-100 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="输入系统提示词..."
                      />
                    </div>
                  </div>

                  {/* Template Edit Actions */}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={cancelEditTemplate}
                      className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={saveTemplate}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      {isNewTemplate ? "添加" : "保存"}
                    </button>
                  </div>
                </>
              )}

              {settingsTab === "history" && (
                <>
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-4xl mb-2">📭</p>
                      <p>暂无历史记录</p>
                      <p className="text-xs mt-1">转换后的内容会保存在这里（SQLite）</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-400">
                          共 {history.length} 条记录（保留 1000 条 / 30 天）
                        </span>
                        <button
                          onClick={clearHistory}
                          className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded transition-colors"
                        >
                          清空全部
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {history.map((item) => (
                          <div
                            key={item.id}
                            className="bg-gray-700/30 rounded-lg border border-gray-700 overflow-hidden"
                          >
                            {/* History Header */}
                            <div
                              className="p-2 flex items-center justify-between cursor-pointer hover:bg-gray-700/50"
                              onClick={() =>
                                setHistoryExpanded(
                                  historyExpanded === item.id ? null : item.id
                                )
                              }
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {formatTime(item.timestamp)}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded">
                                  {item.template_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(item.output);
                                  }}
                                  className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                                >
                                  复制
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteHistoryItem(item.id);
                                  }}
                                  className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded transition-colors"
                                >
                                  删除
                                </button>
                                <span className="text-gray-500 text-xs">
                                  {historyExpanded === item.id ? "▲" : "▼"}
                                </span>
                              </div>
                            </div>

                            {/* History Content */}
                            {historyExpanded === item.id && (
                              <div className="px-3 pb-3 space-y-2 border-t border-gray-700/50">
                                {/* Input Preview */}
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500">输入：</span>
                                  <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                                    {item.input}
                                  </p>
                                </div>
                                {/* Output Preview */}
                                <div>
                                  <span className="text-xs text-gray-500">输出：</span>
                                  <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">
                                    {item.output}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {settingsTab === "general" && (
                <>
                  {/* Output Mode */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      输出模式
                    </label>
                    <select
                      value={config.output_mode}
                      onChange={(e) =>
                        setConfig({ ...config, output_mode: e.target.value })
                      }
                      className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="clipboard">剪贴板（转换后自动复制）</option>
                      <option value="manual">手动（自己复制）</option>
                    </select>
                  </div>

                  {/* AI Backend */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      AI 后端
                    </label>
                    <select
                      value={config.selected_backend}
                      onChange={(e) =>
                        setConfig({ ...config, selected_backend: e.target.value })
                      }
                      className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="minimax">MiniMax (mmx CLI)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Settings Footer */}
            {settingsTab === "general" && (
              <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={saveConfig}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  保存
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
