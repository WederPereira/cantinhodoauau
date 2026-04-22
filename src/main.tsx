import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeColor } from "./hooks/useThemeColor";

// Apply persisted theme color before React mounts (no flash)
try {
  const saved = localStorage.getItem("app-theme-color") || "teal";
  applyThemeColor(saved);
} catch {
  // ignore
}

createRoot(document.getElementById("root")!).render(<App />);
