import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { applyThemeColor } from "./hooks/useThemeColor";

const rootElement = document.getElementById("root");

const applySavedThemeColor = () => {
  try {
    const saved = localStorage.getItem("app-theme-color") || "teal";
    applyThemeColor(saved);
  } catch {
    // ignore
  }
};

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

const forceFreshReload = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("refresh", Date.now().toString());
  window.location.replace(url.toString());
};

const setupAutoUpdates = () => {
  if (!("serviceWorker" in navigator) || isPreviewHost || isInIframe || import.meta.env.DEV) {
    navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    return;
  }

  let refreshing = false;
  const reloadOnce = () => {
    if (refreshing) return;
    refreshing = true;
    forceFreshReload();
  };

  navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

  const checkForUpdates = () => {
    navigator.serviceWorker.ready
      .then((registration) => registration.update())
      .catch(() => undefined);
  };

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW: (_swUrl, registration) => {
      registration?.update();
      window.setInterval(() => registration?.update(), 60_000);
    },
    onNeedRefresh: () => {
      updateSW(true);
    },
    onOfflineReady: () => undefined,
  });

  window.addEventListener("focus", checkForUpdates);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkForUpdates();
    }
  });
};

applySavedThemeColor();
setupAutoUpdates();

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
