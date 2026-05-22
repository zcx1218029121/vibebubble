// Shared type definitions for VibeBubble

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  description: string;
  category?: string;  // 模板分类，如"编程"、"写作"、"翻译"
  is_builtin?: boolean;  // 是否内置模板（内置模板不可删除）
}

export interface HistoryItem {
  id: number;
  input: string;
  output_preview: string;
  template_name: string;
  timestamp: number;
  favorite?: boolean;  // 收藏标记
}

export type ApiType = 'anthropic' | 'openai' | 'gemini' | 'deepseek';

export interface ProviderProfile {
  id: string;
  name: string;
  api_type: ApiType;
  base_url: string;
  api_key: string;
  model: string;
  is_full_url?: boolean;
}

export interface BackendConfig {
  profiles: ProviderProfile[];
  selected_profile_id: string;
}

export interface ShortcutConfig {
  modifiers: string[];
  key: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export const API_TYPE_DEFAULTS: Record<ApiType, { base_url: string; model: string }> = {
  anthropic: { base_url: "https://api.anthropic.com", model: "claude-sonnet-4-20250514" },
  openai: { base_url: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  gemini: { base_url: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash" },
  deepseek: { base_url: "https://api.deepseek.com/v1", model: "deepseek-chat" },
};

export const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  profiles: [],
  selected_profile_id: "",
};

export const DEFAULT_SHORTCUT: ShortcutConfig = {
  modifiers: ["meta", "shift"],
  key: "v",
};

export interface AppConfig {
  templates: PromptTemplate[];
  selected_template_id: string;
  output_mode: string;
  backend: BackendConfig;
  shortcut: ShortcutConfig;
  theme: ThemeMode;
}

export const DEFAULT_TEMPLATE: PromptTemplate = {
  id: "default",
  name: "想法→任务",
  description: "将粗糙想法转化为清晰可执行的任务描述",
  category: "效率",
  is_builtin: true,
  prompt: `你是一个代码助手。用户会输入一段粗糙的想法或需求，请将其转化为清晰、具体、可执行的任务描述。

要求：
1. 清晰描述要做什么（不是怎么做）
2. 列出具体的步骤（如果复杂）
3. 标注可能的难点或需要注意的地方
4. 保持简洁，用 Bullet Point

直接输出结果，不要加任何前缀或解释。`,
};

export const PRESET_TEMPLATES: PromptTemplate[] = [
  DEFAULT_TEMPLATE,
  {
    id: "code-comment",
    name: "代码→注释",
    description: "给代码添加注释和说明",
    category: "编程",
    is_builtin: true,
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
    category: "翻译",
    is_builtin: true,
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
    category: "写作",
    is_builtin: true,
    prompt: `你是一个总结助手。用户会输入一段文字，请提取关键信息并总结。

要求：
1. 提取 3-7 个关键要点
2. 每个要点一句话
3. 按重要性排序
4. 保留原文的核心信息

直接输出总结，不要加任何前缀。`,
  },
  {
    id: "review",
    name: "代码审查",
    description: "审查代码并提出改进建议",
    category: "编程",
    is_builtin: true,
    prompt: `你是一个代码审查助手。用户会输入一段代码，请审查并提供改进建议。

要求：
1. 指出代码的问题和潜在 bug
2. 提供具体的改进建议
3. 解释为什么这样改更好
4. 保持建设性的语气

直接输出审查结果，不要加任何前缀。`,
  },
  {
    id: "refactor",
    name: "代码重构",
    description: "重构代码使其更简洁、更易读",
    category: "编程",
    is_builtin: true,
    prompt: `你是一个代码重构助手。用户会输入一段代码，请重构使其更简洁、更易读、更高效。

要求：
1. 保持原有功能不变
2. 提高代码可读性和可维护性
3. 解释主要改动和原因
4. 标注需要注意的地方

直接输出重构后的代码，不要加任何前缀。`,
  },
];

export const TEMPLATE_CATEGORIES = ["全部", "编程", "写作", "翻译", "效率", "其他"];
