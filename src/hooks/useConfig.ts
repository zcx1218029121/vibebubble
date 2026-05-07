import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { AppConfig, PromptTemplate } from "../types";
import { PRESET_TEMPLATES, DEFAULT_BACKEND_CONFIG } from "../types";

const DEFAULT_CONFIG: AppConfig = {
  templates: PRESET_TEMPLATES,
  selected_template_id: "default",
  output_mode: "clipboard",
  selected_backend: "minimax",
  backends: DEFAULT_BACKEND_CONFIG,
};

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await invoke<AppConfig>("load_config");
      if (cfg.templates && cfg.templates.length > 0) {
        setConfig(cfg);
      } else {
        setConfig({
          ...cfg,
          templates: PRESET_TEMPLATES,
          selected_template_id: cfg.selected_template_id || "default",
          backends: cfg.backends || DEFAULT_BACKEND_CONFIG,
        });
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoaded(true);
    }
  }, []);

  const saveConfig = useCallback(async (cfg?: AppConfig) => {
    try {
      await invoke("save_config", { config: cfg || config });
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  }, [config]);

  const getCurrentTemplate = useCallback((): PromptTemplate => {
    return config.templates.find((t) => t.id === config.selected_template_id) || PRESET_TEMPLATES[0];
  }, [config.templates, config.selected_template_id]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Listen for config-updated events from settings window
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    const setup = async () => {
      unlisten = await listen("config-updated", () => {
        loadConfig();
      });
    };
    setup();
    return () => { unlisten?.(); };
  }, [loadConfig]);

  // Reload config when main window gains focus
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | null = null;
    const setup = async () => {
      unlisten = await win.onFocusChanged(({ payload: focused }) => {
        if (focused) {
          loadConfig();
        }
      });
    };
    setup();
    return () => { unlisten?.(); };
  }, [loadConfig]);

  return { config, setConfig, loadConfig, saveConfig, getCurrentTemplate, loaded };
}
