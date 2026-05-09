import { useState, useEffect } from "react";
import type { ShortcutConfig } from "../types";
import { invoke } from "@tauri-apps/api/core";

interface ShortcutInputProps {
  value: ShortcutConfig;
  onChange: (config: ShortcutConfig) => void;
}

const MODIFIER_SYMBOLS: Record<string, string> = {
  meta: "⌘",
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
};

function formatShortcut(config: ShortcutConfig): string {
  const parts = config.modifiers.map((m) => MODIFIER_SYMBOLS[m] || m);
  parts.push(config.key.toUpperCase());
  return parts.join("");
}

type Status = "idle" | "testing" | "success" | "error";

export function ShortcutInput({ value, onChange }: ShortcutInputProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [display, setDisplay] = useState("");

  useEffect(() => {
    setDisplay(formatShortcut(value));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();

    // Ignore if no modifiers
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      return;
    }

    const modifiers: string[] = [];
    if (e.metaKey) modifiers.push("meta");
    if (e.ctrlKey) modifiers.push("ctrl");
    if (e.altKey) modifiers.push("alt");
    if (e.shiftKey) modifiers.push("shift");

    const key = e.key;
    const newConfig = { modifiers, key };
    onChange(newConfig);
    setDisplay(formatShortcut(newConfig));
    setStatus("idle");
  };

  const handleTest = async () => {
    setStatus("testing");
    try {
      await invoke("try_register_shortcut", {
        modifiers: value.modifiers,
        key: value.key,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const handleApply = async () => {
    setStatus("testing");
    try {
      await invoke("save_shortcut", {
        modifiers: value.modifiers,
        key: value.key,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={display || "按下快捷键..."}
        onKeyDown={handleKeyDown}
        readOnly
        placeholder="按下快捷键..."
        className={`flex-1 bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
          status === "success" ? "border-2 border-green-500" : ""
        } ${status === "error" ? "border-2 border-red-500" : ""}`}
      />
      <button
        onClick={handleTest}
        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
          status === "success"
            ? "bg-green-600 text-white"
            : status === "error"
            ? "bg-red-600 text-white"
            : "bg-gray-600 hover:bg-gray-500 text-white"
        }`}
      >
        {status === "success" ? "✓ 生效" : status === "error" ? "✗ 冲突" : "测试"}
      </button>
      <button
        onClick={handleApply}
        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm transition-colors"
      >
        应用
      </button>
    </div>
  );
}
