import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Web app served from the same FastAPI backend on :4008. The PWA plugin
// just makes it installable/offline-shell-cacheable in a browser; it has
// nothing to do with native mobile packaging.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Homework & Task Tracker',
        short_name: 'Tasks',
        description: 'Homework and task tracker',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Cache the app shell only — API responses always go to the
        // network so task data is never served stale from cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'app-shell', networkTimeoutSeconds: 2 }
          }
        ]
      }
    })
  ],
  server: {
    host: true, // expose on LAN for testing against the dev server
    port: 5173,
    proxy: {
      // During `npm run dev`, forward /api to the FastAPI backend so the
      // frontend can keep using relative URLs in dev too.
      '/api': {
        target: 'http://localhost:4008',
        changeOrigin: true
      }
    }
  }
});
