// Shared type definitions for VibeBubble

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  description: string;
}

export interface HistoryItem {
  id: number;
  input: string;
  output: string;
  output_preview: string;
  template_name: string;
  timestamp: number;
}

export interface BackendConfig {
  minimax_base_url: string;
  minimax_api_key: string;
  minimax_model: string;
  openai_base_url: string;
  openai_api_key: string;
  openai_model: string;
  claude_base_url: string;
  claude_api_key: string;
  claude_model: string;
  ollama_base_url: string;
  ollama_api_key: string;
  ollama_model: string;
}

export const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  minimax_base_url: "https://api.minimax.chat",
  minimax_api_key: "",
  minimax_model: "MiniMax-Text-01",
  openai_base_url: "https://api.openai.com/v1",
  openai_api_key: "",
  openai_model: "gpt-4o-mini",
  claude_base_url: "https://api.anthropic.com",
  claude_api_key: "",
  claude_model: "claude-sonnet-4-20250514",
  ollama_base_url: "http://localhost:11434",
  ollama_api_key: "",
  ollama_model: "llama3.2",
};

export interface AppConfig {
  templates: PromptTemplate[];
  selected_template_id: string;
  output_mode: string;
  selected_backend: string;
  backends: BackendConfig;
}

export const DEFAULT_TEMPLATE: PromptTemplate = {
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

export const PRESET_TEMPLATES: PromptTemplate[] = [
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
