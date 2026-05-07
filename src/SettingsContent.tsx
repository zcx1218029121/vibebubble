import { useState } from "react";
import type { PromptTemplate, HistoryItem, BackendConfig } from "./types";
import { formatTime } from "./utils";
import { useConfig } from "./hooks/useConfig";
import { useHistory } from "./hooks/useHistory";
import { useToast } from "./hooks/useToast";

// 默认填充配置
const DEFAULT_CONFIGS: Record<string, Partial<BackendConfig>> = {
  minimax: {
    minimax_base_url: "https://api.minimax.chat",
    minimax_model: "MiniMax-Text-01",
  },
  openai: {
    openai_base_url: "https://api.openai.com/v1",
    openai_model: "gpt-4o-mini",
  },
  claude: {
    claude_base_url: "https://api.anthropic.com",
    claude_model: "claude-sonnet-4-20250514",
  },
  ollama: {
    ollama_base_url: "http://localhost:11434",
    ollama_model: "llama3.2",
  },
};

interface ProviderConfigProps {
  backend: string;
  config: BackendConfig;
  onUpdate: (updates: Partial<BackendConfig>) => void;
  onFillDefaults: () => void;
}

function ProviderConfig({ backend, config, onUpdate, onFillDefaults }: ProviderConfigProps) {
  const fields: Record<string, { label: string; key: keyof BackendConfig; placeholder: string; isSecret?: boolean }[]> = {
    minimax: [
      { label: "Base URL", key: "minimax_base_url", placeholder: "https://api.minimax.chat" },
      { label: "API Key", key: "minimax_api_key", placeholder: "eyJh...", isSecret: true },
      { label: "模型", key: "minimax_model", placeholder: "MiniMax-Text-01" },
    ],
    openai: [
      { label: "Base URL", key: "openai_base_url", placeholder: "https://api.openai.com/v1" },
      { label: "API Key", key: "openai_api_key", placeholder: "sk-...", isSecret: true },
      { label: "模型", key: "openai_model", placeholder: "gpt-4o-mini" },
    ],
    claude: [
      { label: "Base URL", key: "claude_base_url", placeholder: "https://api.anthropic.com" },
      { label: "API Key", key: "claude_api_key", placeholder: "sk-ant-...", isSecret: true },
      { label: "模型", key: "claude_model", placeholder: "claude-sonnet-4-20250514" },
    ],
    ollama: [
      { label: "Base URL", key: "ollama_base_url", placeholder: "http://localhost:11434" },
      { label: "API Key", key: "ollama_api_key", placeholder: "(可选)", isSecret: true },
      { label: "模型", key: "ollama_model", placeholder: "llama3.2" },
    ],
  };

  const labels: Record<string, string> = {
    minimax: "MiniMax",
    openai: "OpenAI",
    claude: "Claude",
    ollama: "Ollama",
  };

  const currentFields = fields[backend] || [];

  return (
    <div className="p-4 rounded-lg bg-gray-700/30 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-200">{labels[backend] || backend}</h4>
        <button
          onClick={onFillDefaults}
          className="text-xs px-2 py-1 bg-blue-600/50 hover:bg-blue-600 rounded transition-colors"
        >
          默认填充
        </button>
      </div>
      <div className="space-y-3">
        {currentFields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
            {field.isSecret ? (
              <input
                type="password"
                value={config[field.key] || ""}
                onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full bg-gray-600 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <input
                type="text"
                value={config[field.key] || ""}
                onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full bg-gray-600 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsContent() {
  const { config, setConfig, saveConfig } = useConfig();
  const { history } = useHistory();
  const { toast, showToast } = useToast();

  const [settingsTab, setSettingsTab] = useState<"general" | "templates" | "history" | "providers">("general");
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);

  return (
    <div className="h-full flex flex-col relative">
      {/* Toast */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-lg font-medium text-gray-200 mb-4">⚙️ 设置</h2>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-4">
          <button
            onClick={() => setSettingsTab("general")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              settingsTab === "general" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            通用
          </button>
          <button
            onClick={() => setSettingsTab("providers")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              settingsTab === "providers" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            服务商
          </button>
          <button
            onClick={() => setSettingsTab("templates")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              settingsTab === "templates" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            模板
          </button>
          <button
            onClick={() => setSettingsTab("history")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              settingsTab === "history" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            历史
          </button>
        </div>

        {settingsTab === "general" && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">输出模式</label>
              <select
                value={config.output_mode}
                onChange={(e) => setConfig({ ...config, output_mode: e.target.value })}
                className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="clipboard">剪贴板（转换后自动复制）</option>
                <option value="manual">手动（自己复制）</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">AI 后端</label>
              <select
                value={config.selected_backend}
                onChange={(e) => setConfig({ ...config, selected_backend: e.target.value })}
                className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="minimax/{config.backends.minimax_model}">
                  MiniMax - {config.backends.minimax_model || "未配置"}
                </option>
                <option value="openai/{config.backends.openai_model}">
                  OpenAI - {config.backends.openai_model || "未配置"}
                </option>
                <option value="claude/{config.backends.claude_model}">
                  Claude - {config.backends.claude_model || "未配置"}
                </option>
                <option value="ollama/{config.backends.ollama_model}">
                  Ollama - {config.backends.ollama_model || "未配置"}
                </option>
              </select>
            </div>
            <button
              onClick={() => { saveConfig(); showToast("设置已保存"); }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              保存
            </button>
          </div>
        )}

        {settingsTab === "providers" && (
          <div className="space-y-4">
            <ProviderConfig
              backend="minimax"
              config={config.backends}
              onUpdate={(updates) => setConfig({ ...config, backends: { ...config.backends, ...updates } })}
              onFillDefaults={() => setConfig({ ...config, backends: { ...config.backends, ...DEFAULT_CONFIGS.minimax } })}
            />
            <ProviderConfig
              backend="openai"
              config={config.backends}
              onUpdate={(updates) => setConfig({ ...config, backends: { ...config.backends, ...updates } })}
              onFillDefaults={() => setConfig({ ...config, backends: { ...config.backends, ...DEFAULT_CONFIGS.openai } })}
            />
            <ProviderConfig
              backend="claude"
              config={config.backends}
              onUpdate={(updates) => setConfig({ ...config, backends: { ...config.backends, ...updates } })}
              onFillDefaults={() => setConfig({ ...config, backends: { ...config.backends, ...DEFAULT_CONFIGS.claude } })}
            />
            <ProviderConfig
              backend="ollama"
              config={config.backends}
              onUpdate={(updates) => setConfig({ ...config, backends: { ...config.backends, ...updates } })}
              onFillDefaults={() => setConfig({ ...config, backends: { ...config.backends, ...DEFAULT_CONFIGS.ollama } })}
            />
            <div className="flex justify-end">
              <button
                onClick={() => { saveConfig(); showToast("服务商配置已保存"); }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                保存全部
              </button>
            </div>
          </div>
        )}

        {settingsTab === "templates" && !editingTemplate && (
          <div className="space-y-2">
            {config.templates.map((template) => (
              <div key={template.id} className="p-3 rounded-lg border border-gray-700 bg-gray-700/30">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-200">{template.name}</span>
                    <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingTemplate({ ...template });
                        setIsNewTemplate(false);
                      }}
                      className="text-xs px-2 py-1 bg-blue-600/50 hover:bg-blue-600 rounded transition-colors"
                    >
                      编辑
                    </button>
                    {config.templates.length > 1 && (
                      <button
                        onClick={() => {
                          const newTemplates = config.templates.filter((t) => t.id !== template.id);
                          const newSelectedId = config.selected_template_id === template.id
                            ? newTemplates[0].id
                            : config.selected_template_id;
                          const newConfig = { ...config, templates: newTemplates, selected_template_id: newSelectedId };
                          setConfig(newConfig);
                          saveConfig(newConfig);
                          showToast("模板已删除");
                        }}
                        className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded transition-colors"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setEditingTemplate({ id: `t_${Date.now()}`, name: "新模板", description: "描述", prompt: "" });
                setIsNewTemplate(true);
              }}
              className="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
            >
              + 添加模板
            </button>
          </div>
        )}

        {settingsTab === "templates" && editingTemplate && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">模板名称</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">描述</label>
              <input
                type="text"
                value={editingTemplate.description}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">提示词</label>
              <textarea
                value={editingTemplate.prompt}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, prompt: e.target.value })}
                className="w-full h-40 bg-gray-700 rounded-lg p-3 text-gray-100 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  let newConfig;
                  if (isNewTemplate) {
                    newConfig = {
                      ...config,
                      templates: [...config.templates, editingTemplate],
                      selected_template_id: editingTemplate.id,
                    };
                  } else {
                    newConfig = {
                      ...config,
                      templates: config.templates.map((t) => t.id === editingTemplate.id ? editingTemplate : t),
                    };
                  }
                  setConfig(newConfig);
                  setEditingTemplate(null);
                  saveConfig(newConfig);
                  showToast("模板已保存");
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {settingsTab === "history" && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无历史记录</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-gray-700/30 border border-gray-700 cursor-pointer hover:bg-gray-700/50"
                  onClick={() => setSelectedHistory(item)}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{formatTime(item.timestamp)}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded">{item.template_name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const textarea = document.createElement("textarea");
                          textarea.value = item.input;
                          textarea.style.position = "fixed";
                          textarea.style.opacity = "0";
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand("copy");
                          document.body.removeChild(textarea);
                          showToast("已复制输入");
                        }}
                        className="text-xs px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 rounded"
                      >
                        复制输入
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 break-words">{item.input}</p>
                  <p className="text-xs text-gray-400 mt-1 break-words">{item.output_preview}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Detail Modal */}
        {selectedHistory && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setSelectedHistory(null)}
          >
            <div
              className="bg-gray-800 rounded-xl w-[500px] max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-gray-200">历史详情</h3>
                <button
                  onClick={() => setSelectedHistory(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span>{formatTime(selectedHistory.timestamp)}</span>
                    <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded">{selectedHistory.template_name}</span>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">输入：</span>
                      <button
                        onClick={() => {
                          const textarea = document.createElement("textarea");
                          textarea.value = selectedHistory.input;
                          textarea.style.position = "fixed";
                          textarea.style.opacity = "0";
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand("copy");
                          document.body.removeChild(textarea);
                          showToast("输入已复制");
                        }}
                        className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 break-words whitespace-pre-wrap mt-1 bg-gray-700/50 rounded-lg p-3 max-h-[200px] overflow-y-auto">{selectedHistory.input}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">输出：</span>
                      <button
                        onClick={() => {
                          const textarea = document.createElement("textarea");
                          textarea.value = selectedHistory.output_preview;
                          textarea.style.position = "fixed";
                          textarea.style.opacity = "0";
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand("copy");
                          document.body.removeChild(textarea);
                          showToast("输出已复制");
                        }}
                        className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 break-words whitespace-pre-wrap mt-1 bg-gray-700/50 rounded-lg p-3 max-h-[300px] overflow-y-auto">{selectedHistory.output_preview}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
