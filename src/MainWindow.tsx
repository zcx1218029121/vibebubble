import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PromptTemplate, HistoryItem } from "./types";
import { useConfig } from "./hooks/useConfig";
import { useHistory } from "./hooks/useHistory";
import { useClipboard } from "./hooks/useClipboard";
import { useToast } from "./hooks/useToast";
import { TemplateEditor } from "./components/TemplateEditor";
import { HistoryList } from "./components/HistoryList";

export function MainWindow() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "templates" | "history">("templates");
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const configLoaded = useRef(false);

  const { config, setConfig, loadConfig, saveConfig, getCurrentTemplate } = useConfig();
  const { history, deleteHistoryItem, clearHistory, loadHistory } = useHistory();
  const { toast, showToast, hideToast } = useToast();
  const { copyToClipboard } = useClipboard();

  // Load config and history on mount (only once)
  useEffect(() => {
    if (configLoaded.current) return;
    configLoaded.current = true;
    loadConfig();
    loadHistory();
  }, [loadConfig, loadHistory]);

  // Reload config when window gains focus (to catch changes from settings window)
  useEffect(() => {
    const handleFocus = () => {
      loadConfig();
      loadHistory();
    };

    const win = getCurrentWindow();
    const unlistenPromise = win.onFocusChanged(handleFocus);

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [loadConfig, loadHistory]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");

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
        const success = await copyToClipboard(result);
        if (success) {
          setCopied(true);
          showToast("已复制到剪贴板");
        } else {
          showToast("复制失败");
        }
        setTimeout(() => {
          setCopied(false);
          hideToast();
        }, 2000);
      }
    } catch (err) {
      setOutput(`错误: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      showToast("已复制到剪贴板");
    } else {
      showToast("复制失败");
    }
    setTimeout(() => {
      setCopied(false);
      hideToast();
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
    const newConfig = { ...config, templates: newTemplates, selected_template_id: newSelectedId };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleSaveTemplate = (editedTemplate: PromptTemplate) => {
    let newConfig;
    if (isNewTemplate) {
      newConfig = {
        ...config,
        templates: [...config.templates, editedTemplate],
        selected_template_id: editedTemplate.id,
      };
    } else {
      newConfig = {
        ...config,
        templates: config.templates.map((t) =>
          t.id === editedTemplate.id ? editedTemplate : t
        ),
      };
    }
    setConfig(newConfig);
    saveConfig(newConfig);
    setEditingTemplate(null);
    setIsNewTemplate(false);
  };

  const cancelEditTemplate = () => {
    setEditingTemplate(null);
    setIsNewTemplate(false);
  };

  return (
    <div
      className="h-screen bg-gray-900 text-white flex flex-col select-none overflow-hidden"
      style={{ padding: '24px' }}
    >
      {/* Toast */}
      {toast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}
      {/* Header - draggable */}
      <div
        className="flex items-center justify-between mb-3 flex-shrink-0"
        data-tauri-drag-region
        style={{ webkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💭</span>
          <span className="font-medium text-gray-200">VibeBubble</span>
        </div>
        <div className="flex items-center gap-2" style={{ webkitAppRegion: "no-drag" } as React.CSSProperties}>
          <span className="text-xs text-gray-500">v0.5.0</span>
          <button
            onClick={async () => {
              try {
                await invoke("open_settings_window");
              } catch (e) {
                console.error("Failed to open settings:", e);
              }
            }}
            className="text-gray-400 hover:text-white transition-colors"
            title="设置"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Template Selector */}
      <div className="mb-3 flex-shrink-0">
        <select
          value={config.selected_template_id}
          onChange={(e) => {
            const newConfig = { ...config, selected_template_id: e.target.value };
            setConfig(newConfig);
            saveConfig(newConfig);
          }}
          className="w-full bg-gray-800 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {config.templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content - no outer scroll, inner scroll only */}
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        {/* Input Area */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`输入你的想法，按 Enter 转换...\n当前模板: ${getCurrentTemplate().name}`}
          className="w-full h-28 bg-gray-800 rounded-lg p-3 text-gray-100 placeholder-gray-500 resize-none outline-none focus:ring-2 focus:ring-blue-500 mt-2"
          disabled={loading}
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="ai-spinner"></span>
              AI 转换中...
            </span>
          ) : (
            "✨ 转换"
          )}
        </button>

        {/* Output Area */}
        {output && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
              <span className="text-xs text-gray-400">
                输出结果 {copied && "✅ 已复制"}
              </span>
              <button
                onClick={() => handleCopy(output)}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                📋 复制
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-800 rounded-xl p-3 text-gray-100 whitespace-pre-wrap select-text">
              {output}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
        <span>按 Esc 隐藏</span>
        <span>⚙️ Cmd+Shift+V 呼出</span>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl w-[560px] max-h-[90vh] overflow-hidden flex flex-col">
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
                <TemplateEditor
                  template={editingTemplate}
                  isNew={isNewTemplate}
                  onSave={handleSaveTemplate}
                  onCancel={cancelEditTemplate}
                />
              )}

              {settingsTab === "history" && (
                <HistoryList
                  history={history}
                  onDelete={deleteHistoryItem}
                  onClear={clearHistory}
                />
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
                      onChange={(e) => {
                        const newConfig = { ...config, output_mode: e.target.value };
                        setConfig(newConfig);
                        saveConfig(newConfig);
                      }}
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
                      onChange={(e) => {
                        const newConfig = { ...config, selected_backend: e.target.value };
                        setConfig(newConfig);
                        saveConfig(newConfig);
                      }}
                      className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="minimax">MiniMax</option>
                      <option value="openai">OpenAI</option>
                      <option value="claude">Claude</option>
                      <option value="ollama">Ollama (本地)</option>
                    </select>
                  </div>

                  {/* Backend Config - MiniMax */}
                  {config.selected_backend === "minimax" && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">MiniMax API Key</label>
                        <input
                          type="password"
                          value={config.backends?.minimax_api_key || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, backends: { ...config.backends, minimax_api_key: e.target.value } };
                            setConfig(newConfig);
                            saveConfig(newConfig);
                          }}
                          placeholder="输入 MiniMax API Key"
                          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">模型</label>
                        <input
                          type="text"
                          value={config.backends?.minimax_model || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, backends: { ...config.backends, minimax_model: e.target.value } };
                            setConfig(newConfig);
                            saveConfig(newConfig);
                          }}
                          placeholder="MiniMax-Text-01"
                          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Backend Config - OpenAI */}
                  {config.selected_backend === "openai" && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">OpenAI API Key</label>
                        <input
                          type="password"
                          value={config.backends?.openai_api_key || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, backends: { ...config.backends, openai_api_key: e.target.value } };
                            setConfig(newConfig);
                            saveConfig(newConfig);
                          }}
                          placeholder="sk-..."
                          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">模型</label>
                        <input
                          type="text"
                          value={config.backends?.openai_model || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, backends: { ...config.backends, openai_model: e.target.value } };
                            setConfig(newConfig);
                            saveConfig(newConfig);
                          }}
                          placeholder="gpt-4o-mini"
                          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Backend Config - Claude */}
                  {config.selected_backend === "claude" && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Claude API Key</label>
                        <input
                          type="password"
                          value={config.backends?.claude_api_key || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, backends: { ...config.backends, claude_api_key: e.target.value } };
                            setConfig(newConfig);
                            saveConfig(newConfig);
                          }}
                          placeholder="sk-ant-..."
                          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">模型</label>
                        <input
                          type="text"
                          value={config.backends?.claude_model || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, backends: { ...config.backends, claude_model: e.target.value } };
                            setConfig(newConfig);
                            saveConfig(newConfig);
                          }}
                          placeholder="claude-sonnet-4-20250514"
                          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Backend Config - Ollama */}
                  {config.selected_backend === "ollama" && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Ollama Base URL</label>
                        <input
                          type="text"
                          value={config.backends?.ollama_base_url || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, backends: { ...config.backends, ollama_base_url: e.target.value } };
                            setConfig(newConfig);
                            saveConfig(newConfig);
                          }}
                          placeholder="http://localhost:11434"
                          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">模型</label>
                        <input
                          type="text"
                          value={config.backends?.ollama_model || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, backends: { ...config.backends, ollama_model: e.target.value } };
                            setConfig(newConfig);
                            saveConfig(newConfig);
                          }}
                          placeholder="llama3.2"
                          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
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
                  onClick={() => saveConfig()}
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
