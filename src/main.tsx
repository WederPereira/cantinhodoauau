import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeColor } from "./hooks/useThemeColor";

const rootElement = document.getElementById("root");
const LEGACY_CACHE_CLEANUP_KEY = "legacy-sw-cleanup-v1";

const applySavedThemeColor = () => {
  try {
    const saved = localStorage.getItem("app-theme-color") || "teal";
    applyThemeColor(saved);
  } catch {
    // ignore
  }
};

const cleanupLegacyCaches = async () => {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window && !sessionStorage.getItem(LEGACY_CACHE_CLEANUP_KEY)) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      sessionStorage.setItem(LEGACY_CACHE_CLEANUP_KEY, "true");
    }
  } catch {
    // ignore
  }
};

applySavedThemeColor();
cleanupLegacyCaches();

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
