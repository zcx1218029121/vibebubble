import { useCallback } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * Unified clipboard write using Tauri plugin.
 * Falls back gracefully if Tauri API is unavailable (e.g. in browser dev).
 */
export function useClipboard() {
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await writeText(text);
      return true;
    } catch (err) {
      console.warn("Tauri clipboard write failed:", err);
      return false;
    }
  }, []);

  return { copyToClipboard };
}
