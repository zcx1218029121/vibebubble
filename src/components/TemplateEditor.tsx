import { useState } from "react";
import type { PromptTemplate } from "../types";

interface TemplateEditorProps {
  template: PromptTemplate;
  isNew: boolean;
  onSave: (template: PromptTemplate) => void;
  onCancel: () => void;
}

export function TemplateEditor({ template, isNew, onSave, onCancel }: TemplateEditorProps) {
  const [editing, setEditing] = useState<PromptTemplate>({ ...template });

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
        <label className="block text-sm font-medium text-gray-300 mb-1">提示词内容</label>
        <textarea
          value={editing.prompt}
          onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
          className="w-full h-48 bg-gray-700 rounded-lg p-3 text-gray-100 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入系统提示词..."
          aria-label="提示词内容"
        />
      </div>
      <div className="flex justify-end gap-2">
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
