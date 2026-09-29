import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    // data/ holds raw PDFs, OCR dumps and dataset backups; the app only reads
    // the synced copy under public/data, so don't make the watcher crawl it.
    watch: { ignored: ['**/data/**', '**/android/**', '**/scraper/**'] },
  },
  build: {
    target: 'es2019',
    // Keep the JS lean for Indian mobile networks: split vendor + route chunks.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // One vendor chunk for all third-party code: avoids cross-chunk
          // circular imports while app pages stay individually code-split.
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        },
      },
    },
    // Warn late — the whole point of this app is to stay small.
    chunkSizeWarningLimit: 600,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'buses/*.svg'],
      manifest: {
        name: 'Maharashtra ST Bus Timetable',
        short_name: 'ST Timetable',
        description:
          'Maharashtra ST (MSRTC) bus timetable — search bus timings between cities. Independent information service, not affiliated with MSRTC.',
        theme_color: '#b91c1c',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'mr',
        categories: ['travel', 'navigation', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Lock-screen alerts for the installed PWA (periodic sync + notification taps).
        importScripts: ['sw-alerts.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Data JSON: serve from cache first, refresh in background so the app
        // works fully offline but still picks up new datasets when online.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'st-timetable-data',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
