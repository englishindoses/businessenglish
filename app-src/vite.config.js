import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The live site is a GitHub Pages project site:
//   https://englishindoses.github.io/businessenglish/
// The app is served from the /app folder inside it.
const BASE = '/businessenglish/app/';

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
  },
  build: {
    // Built files go into ../app so GitHub Pages serves them from the main branch.
    outDir: '../app',
    emptyOutDir: true,
  },
  plugins: [
    VitePWA({
      // 'prompt' rather than 'autoUpdate': a student mid-round should not have
      // the page reload under them. They get a small bar instead.
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Business English in Doses — Practice makes Perfect!',
        short_name: 'BizEng',
        description:
          'Extra practice activities for the Business English in Doses course.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#fafbfc',
        theme_color: '#2d6a6a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Google Fonts: cache them so the app keeps its typography offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
