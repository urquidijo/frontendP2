import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
// @ts-ignore: virtual module provided by Vite PWA plugin
import { registerSW } from "virtual:pwa-register";

registerSW({ onNeedRefresh() {}, onOfflineReady() {} });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
