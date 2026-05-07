import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MainWindow } from "./MainWindow";
import { SettingsContent } from "./SettingsContent";

function App() {
  const [windowType, setWindowType] = useState<"main" | "settings">("main");

  // Detect window type on mount
  useEffect(() => {
    const detectWindowType = async () => {
      try {
        const win = getCurrentWindow();
        const label = win.label;
        setWindowType(label === "settings" ? "settings" : "main");
      } catch (e) {
        console.error("Failed to detect window type:", e);
      }
    };
    detectWindowType();
  }, []);

  if (windowType === "settings") {
    return (
      <div
        className="h-screen bg-gray-900 text-white flex flex-col select-none overflow-hidden"
        style={{ padding: '12px' }}
      >
        <SettingsContent />
      </div>
    );
  }

  return <MainWindow />;
}

export default App;
