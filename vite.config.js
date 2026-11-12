import { defineConfig } from 'vite';
import { generateSW } from 'workbox-build';

// GitHub Pages project sites are served from /<repo>/, so the deploy
// workflow sets VITE_BASE=/palio1.0/. Local development keeps "/".
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: false
  },
  plugins: [
    {
      name: 'generate-sw',
      async closeBundle() {
        await generateSW({
          swDest: 'dist/sw.js',
          globDirectory: 'dist',
          globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
          navigateFallback: 'index.html',
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.github\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'github-api',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ],
          manifestTransforms: [
            (manifestEntries) => {
              const manifest = manifestEntries.filter(entry => !entry.url.endsWith('.map'));
              return { manifest, warnings: [] };
            }
          ]
        });
      }
    }
  ]
});
