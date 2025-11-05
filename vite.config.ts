import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo192.png", "logo512.png"],
      manifest: {
        name: "ElectroStore",
        short_name: "ElectroStore",
        description: "Tienda online de electrodomesticos",
        theme_color: "#0ea5e9",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/logo192.png", sizes: "192x192", type: "image/png" },
          { src: "/logo512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/imagenes-julio\.s3(?:\.[\w-]+)?\.amazonaws\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "product-images",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        suppressWarnings: true,
      },
    }),
  ],
});
