import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { HistoryItem } from "../types";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const items = await invoke<HistoryItem[]>("get_history", { limit: 100 });
      setHistory(items);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  const deleteHistoryItem = useCallback(async (id: number) => {
    try {
      await invoke("delete_history_item", { id });
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await invoke("clear_history");
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }, []);

  const addHistoryItem = useCallback(async (input: string, templateName: string) => {
    try {
      await invoke<HistoryItem>("add_history", {
        input,
        // output_preview: generate preview from input
        outputPreview: input,
        templateName,
      });
      await loadHistory();
    } catch (err) {
      console.error("Failed to add history item:", err);
    }
  }, [loadHistory]);

  const toggleFavorite = useCallback(async (id: number, favorite: boolean) => {
    try {
      await invoke<boolean>("toggle_history_favorite", { id });
      setHistory((prev) =>
        prev.map((h) => (h.id === id ? { ...h, favorite } : h))
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Listen for history-updated events
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    const setup = async () => {
      unlisten = await listen("history-updated", () => {
        loadHistory();
      });
    };
    setup();
    return () => { unlisten?.(); };
  }, [loadHistory]);

  return { history, loadHistory, deleteHistoryItem, clearHistory, addHistoryItem, toggleFavorite };
}
