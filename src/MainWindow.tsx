import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { HistoryItem } from "./types";
import { useConfig } from "./hooks/useConfig";
import { useHistory } from "./hooks/useHistory";
import { useClipboard } from "./hooks/useClipboard";
import { useToast } from "./hooks/useToast";

export function MainWindow() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const configLoaded = useRef(false);

  const { config, setConfig, loadConfig, saveConfig, getCurrentTemplate } = useConfig();
  const { loadHistory } = useHistory();
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

      // Add to SQLite history (only store input + template, not output)
      await invoke<HistoryItem>("add_history", {
        input,
        output_preview: input, // use input as preview since we don't store output
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


  return (
    <div
      className="ios-glass h-screen text-white flex flex-col select-none overflow-hidden"
      style={{ padding: '32px' }}
      data-tauri-drag-region
    >
      {/* Toast */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg text-sm border border-white/20">
          {toast}
        </div>
      )}
      {/* Header - draggable */}
      <div
        className="flex items-center justify-between mb-3 flex-shrink-0 cursor-default"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💭</span>
          <span className="font-medium text-white">VibeBubble</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">v0.5.0</span>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await invoke("open_settings_window");
              } catch (e) {
                console.error("Failed to open settings:", e);
              }
            }}
            className="text-white/60 hover:text-white transition-colors"
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
          className="w-full bg-white/10 rounded-xl p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-400/50 text-sm border border-white/10 focus:border-white/40 transition-all"
        >
          {config.templates.map((t) => (
            <option key={t.id} value={t.id} className="bg-gray-800">
              {t.name} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content - no outer scroll, inner scroll only */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Input Area */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`输入你的想法，按 Enter 转换...\n当前模板: ${getCurrentTemplate().name}`}
          className="w-full h-20 bg-white/10 rounded-2xl p-3 text-white placeholder-white/40 resize-none outline-none focus:ring-2 focus:ring-blue-400/50 border border-white/10 focus:border-white/40 transition-all"
          disabled={loading}
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className={`w-full py-3 rounded-2xl font-medium transition-all border-2 ${
            loading
              ? "btn-convert loading text-white"
              : "bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/40 text-white border-white/20 hover:border-white/40"
          }`}
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
          <div className="flex-1 overflow-hidden flex flex-col min-h-[80px]">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span className="text-sm font-medium text-white">
                输出结果 {copied && "✅ 已复制"}
              </span>
              <button
                onClick={() => handleCopy(output)}
                className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
              >
                📋 复制
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 text-gray-100 whitespace-pre-wrap select-text border border-white/10">
              {output}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-white/40 flex-shrink-0">
        <span>按 Esc 隐藏</span>
        <span>⚙️ Cmd+Shift+V 呼出</span>
      </div>
    </div>
  );
}
