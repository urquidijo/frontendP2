import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { clearExpiredCache } from "./core/offlineCache";
// @ts-ignore: virtual module provided by Vite PWA plugin
import { registerSW } from "virtual:pwa-register";

const enablePWA = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    registerSW({ onNeedRefresh() {}, onOfflineReady() {} });
    return;
  }

  const cleanupFlagKey = "pwa-cleanup-done";
  try {
    if (!localStorage.getItem(cleanupFlagKey)) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length) {
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.includes("workbox-precache") || key.includes("offline"))
            .map((key) => caches.delete(key)),
        );
      }
      localStorage.setItem(cleanupFlagKey, "1");
    }
  } catch (error) {
    console.warn("No se pudo limpiar el service worker anterior:", error);
  } finally {
    registerSW({
      onNeedRefresh() {},
      onOfflineReady() {},
    });
  }
};

enablePWA();
clearExpiredCache();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
