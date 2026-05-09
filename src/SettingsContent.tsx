import { useState } from "react";
import type { ProviderProfile, ApiType, PromptTemplate } from "./types";
import { useConfig } from "./hooks/useConfig";
import { useHistory } from "./hooks/useHistory";
import { useToast } from "./hooks/useToast";
import { API_TYPE_DEFAULTS } from "./types";
import { HistoryList } from "./components/HistoryList";
import { TemplateEditor } from "./components/TemplateEditor";

const API_TYPE_LABELS: Record<ApiType, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI 兼容",
};

// 生成唯一 ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

interface ProfileFormProps {
  profile?: ProviderProfile;
  onSave: (profile: ProviderProfile) => void;
  onCancel: () => void;
}

function ProfileForm({ profile, onSave, onCancel }: ProfileFormProps) {
  const [name, setName] = useState(profile?.name || "");
  const [apiType, setApiType] = useState<ApiType>(profile?.api_type || "openai");
  const [baseUrl, setBaseUrl] = useState(profile?.base_url || API_TYPE_DEFAULTS.openai.base_url);
  const [apiKey, setApiKey] = useState(profile?.api_key || "");
  const [model, setModel] = useState(profile?.model || API_TYPE_DEFAULTS.openai.model);
  const [isFullUrl, setIsFullUrl] = useState(profile?.is_full_url || false);

  const handleTypeChange = (newType: ApiType) => {
    setApiType(newType);
    setBaseUrl(API_TYPE_DEFAULTS[newType].base_url);
    setModel(API_TYPE_DEFAULTS[newType].model);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("请输入配置名称");
      return;
    }
    if (!apiKey.trim()) {
      alert("请输入 API Key");
      return;
    }
    onSave({
      id: profile?.id || generateId(),
      name: name.trim(),
      api_type: apiType,
      base_url: baseUrl.trim(),
      api_key: apiKey.trim(),
      model: model.trim(),
      is_full_url: isFullUrl,
    });
  };

  return (
    <div className="p-4 rounded-lg bg-gray-700/30 border border-gray-700 space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">配置名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：我的 GPT-4"
          className="w-full bg-gray-600 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">服务商类型</label>
        <select
          value={apiType}
          onChange={(e) => handleTypeChange(e.target.value as ApiType)}
          className="w-full bg-gray-600 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="openai">OpenAI 兼容</option>
          <option value="anthropic">Anthropic (Claude)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Base URL</label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="w-full bg-gray-600 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isFullUrl"
          checked={isFullUrl}
          onChange={(e) => setIsFullUrl(e.target.checked)}
          className="w-4 h-4 rounded bg-gray-600 border-gray-500"
        />
        <label htmlFor="isFullUrl" className="text-xs text-gray-400">
          完整 URL（不拼接路径）
        </label>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full bg-gray-600 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">模型名称</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gpt-4o-mini"
          className="w-full bg-gray-600 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm transition-colors"
        >
          保存
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-sm transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}

interface ProfileCardProps {
  profile: ProviderProfile;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProfileCard({ profile, isSelected, onSelect, onEdit, onDelete }: ProfileCardProps) {
  return (
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        isSelected ? "bg-blue-600/20 border-blue-500" : "bg-gray-700/30 border-gray-700 hover:border-gray-500"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-200">{profile.name}</div>
          <div className="text-xs text-gray-400 mt-1">
            {API_TYPE_LABELS[profile.api_type]} · {profile.model}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
          >
            编辑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsContent() {
  const { config, setConfig, saveConfig } = useConfig();
  const { toast, showToast } = useToast();
  const { history, deleteHistoryItem, clearHistory } = useHistory();
  const [settingsTab, setSettingsTab] = useState<"general" | "providers" | "templates" | "history">("general");
  const [editingProfile, setEditingProfile] = useState<ProviderProfile | null | "new">(null);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null | "new">(null);

  const backend = config.backend;
  const profiles = backend.profiles;
  const selectedProfile = profiles.find((p) => p.id === backend.selected_profile_id);

  const handleAddProfile = (profile: ProviderProfile) => {
    const existing = profiles.findIndex((p) => p.id === profile.id);
    if (existing >= 0) {
      const newProfiles = [...profiles];
      newProfiles[existing] = profile;
      setConfig({ ...config, backend: { ...backend, profiles: newProfiles } });
    } else {
      setConfig({ ...config, backend: { ...backend, profiles: [...profiles, profile] } });
    }
    setEditingProfile(null);
    saveConfig();
  };

  const handleDeleteProfile = (id: string) => {
    if (!confirm("确定删除这个配置？")) return;
    const newProfiles = profiles.filter((p) => p.id !== id);
    const newSelectedId = backend.selected_profile_id === id ? "" : backend.selected_profile_id;
    setConfig({ ...config, backend: { ...backend, profiles: newProfiles, selected_profile_id: newSelectedId } });
    saveConfig();
  };

  const handleSelectProfile = (id: string) => {
    setConfig({ ...config, backend: { ...backend, selected_profile_id: id } });
    saveConfig();
  };

  // Template management
  const handleSaveTemplate = (template: PromptTemplate) => {
    if (editingTemplate === "new") {
      setConfig({
        ...config,
        templates: [...config.templates, template],
        selected_template_id: template.id,
      });
    } else {
      setConfig({
        ...config,
        templates: config.templates.map((t) => t.id === template.id ? template : t),
      });
    }
    saveConfig();
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    if (config.templates.length <= 1) {
      alert("至少保留一个模板");
      return;
    }
    const newTemplates = config.templates.filter((t) => t.id !== id);
    const newSelectedId = config.selected_template_id === id ? newTemplates[0].id : config.selected_template_id;
    setConfig({ ...config, templates: newTemplates, selected_template_id: newSelectedId });
    saveConfig();
  };

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
                onChange={(e) => { setConfig({ ...config, output_mode: e.target.value }); saveConfig(); }}
                className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="clipboard">剪贴板（转换后自动复制）</option>
                <option value="manual">手动（自己复制）</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">AI 模型</label>
              <select
                value={backend.selected_profile_id}
                onChange={(e) => { handleSelectProfile(e.target.value); }}
                className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择模型...</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({API_TYPE_LABELS[p.api_type]} - {p.model})
                  </option>
                ))}
              </select>
              {selectedProfile && (
                <div className="mt-2 text-xs text-gray-400">
                  当前：{selectedProfile.name} · {API_TYPE_LABELS[selectedProfile.api_type]} · {selectedProfile.base_url}
                </div>
              )}
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
            {profiles.length === 0 && !editingProfile && (
              <div className="text-center py-8 text-gray-400">
                暂无配置，点击下方添加服务商
              </div>
            )}
            
            {profiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                isSelected={p.id === backend.selected_profile_id}
                onSelect={() => handleSelectProfile(p.id)}
                onEdit={() => setEditingProfile(p)}
                onDelete={() => handleDeleteProfile(p.id)}
              />
            ))}

            {editingProfile === "new" && (
              <ProfileForm
                onSave={handleAddProfile}
                onCancel={() => setEditingProfile(null)}
              />
            )}

            {editingProfile && editingProfile !== "new" && (
              <ProfileForm
                profile={editingProfile}
                onSave={handleAddProfile}
                onCancel={() => setEditingProfile(null)}
              />
            )}

            {!editingProfile && (
              <button
                onClick={() => setEditingProfile("new")}
                className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
              >
                + 添加服务商配置
              </button>
            )}
          </div>
        )}

        {settingsTab === "templates" && (
          <div>
            {!editingTemplate && (
              <>
                <div className="space-y-2 mb-4">
                  {config.templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border ${
                        template.id === config.selected_template_id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-700 bg-gray-700/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-200">{template.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{template.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {template.id === config.selected_template_id && (
                            <span className="text-xs text-blue-400">✓ 使用中</span>
                          )}
                          <button
                            onClick={() => setEditingTemplate(template)}
                            className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setEditingTemplate("new")}
                  className="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
                >
                  + 添加新模板
                </button>
              </>
            )}
            {editingTemplate === "new" && (
              <TemplateEditor
                template={{
                  id: `template_${Date.now()}`,
                  name: "新模板",
                  description: "描述这个模板的用途",
                  prompt: "输入提示词内容...",
                }}
                isNew={true}
                onSave={handleSaveTemplate}
                onCancel={() => setEditingTemplate(null)}
              />
            )}
            {editingTemplate && editingTemplate !== "new" && (
              <TemplateEditor
                template={editingTemplate}
                isNew={false}
                onSave={handleSaveTemplate}
                onCancel={() => setEditingTemplate(null)}
              />
            )}
          </div>
        )}

        {settingsTab === "history" && (
          <HistoryList
            history={history}
            onDelete={deleteHistoryItem}
            onClear={clearHistory}
          />
        )}
      </div>
    </div>
  );
}
