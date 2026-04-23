import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeColor } from "./hooks/useThemeColor";

const rootElement = document.getElementById("root");
const LEGACY_CACHE_CLEANUP_KEY = "legacy-sw-cleanup-v1";
const MODULE_RECOVERY_KEY = "module-recovery-ts";

const applySavedThemeColor = () => {
  try {
    const saved = localStorage.getItem("app-theme-color") || "teal";
    applyThemeColor(saved);
  } catch {
    // ignore
  }
};

const forceFreshReload = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("refresh", Date.now().toString());
  window.location.replace(url.toString());
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

const isDynamicImportFailure = (message?: string) =>
  !!message &&
  (message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module"));

const recoverFromStaleClient = () => {
  const now = Date.now();
  const lastAttempt = Number(sessionStorage.getItem(MODULE_RECOVERY_KEY) || 0);

  if (now - lastAttempt < 15000) return;

  sessionStorage.setItem(MODULE_RECOVERY_KEY, String(now));
  cleanupLegacyCaches().finally(() => forceFreshReload());
};

window.addEventListener("error", (event) => {
  const message = event.error?.message || event.message;
  if (isDynamicImportFailure(message)) {
    recoverFromStaleClient();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = typeof reason === "string" ? reason : reason?.message;
  if (isDynamicImportFailure(message)) {
    recoverFromStaleClient();
  }
});

applySavedThemeColor();
cleanupLegacyCaches();

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
