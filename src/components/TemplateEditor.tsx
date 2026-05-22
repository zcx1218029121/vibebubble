import { useState } from "react";
import type { PromptTemplate } from "../types";
import { TEMPLATE_CATEGORIES } from "../types";

interface TemplateEditorProps {
  template: PromptTemplate;
  isNew: boolean;
  onSave: (template: PromptTemplate) => void;
  onCancel: () => void;
}

export function TemplateEditor({ template, isNew, onSave, onCancel }: TemplateEditorProps) {
  const [editing, setEditing] = useState<PromptTemplate>({ ...template });
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");

  const handleExport = () => {
    const json = JSON.stringify(editing, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template_${editing.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const imported = JSON.parse(importJson);
      if (!imported.name || !imported.prompt) {
        alert("Invalid template format: missing name or prompt");
        return;
      }
      // Generate new ID to avoid conflicts
      imported.id = `template_${Date.now()}`;
      imported.is_builtin = false;
      onSave(imported);
      setShowImport(false);
      setImportJson("");
    } catch (e) {
      alert("Invalid JSON format");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">模板名称</label>
        <input
          type="text"
          value={editing.name}
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="如：想法→任务"
          aria-label="模板名称"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">描述</label>
        <input
          type="text"
          value={editing.description}
          onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="这个模板的用途"
          aria-label="模板描述"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">分类</label>
        <select
          value={editing.category || "其他"}
          onChange={(e) => setEditing({ ...editing, category: e.target.value })}
          className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TEMPLATE_CATEGORIES.filter(c => c !== "全部").map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">提示词内容</label>
        <textarea
          value={editing.prompt}
          onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
          className="w-full h-48 bg-gray-700 rounded-lg p-3 text-gray-100 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入系统提示词..."
          aria-label="提示词内容"
        />
      </div>
      
      {/* Import/Export Section */}
      <div className="border-t border-gray-700 pt-3">
        {!showImport ? (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
            >
              📤 导出模板
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
            >
              📥 导入模板
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-gray-400">粘贴 JSON 内容：</label>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="w-full h-24 bg-gray-800 rounded-lg p-2 text-gray-100 text-xs resize-none outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder='{"name": "模板名称", "prompt": "提示词内容", "description": "描述"}'
            />
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors"
              >
                确认导入
              </button>
              <button
                onClick={() => { setShowImport(false); setImportJson(""); }}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => onSave(editing)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          {isNew ? "添加" : "保存"}
        </button>
      </div>
    </div>
  );
}
