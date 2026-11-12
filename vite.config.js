import { defineConfig } from 'vite';
import { generateSW } from 'workbox-build';

export default defineConfig({
  root: '.',
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(String(Date.now()))
  }, // necessário para GitHub Pages (app roda em /nome-do-repo/)
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    rollupOptions: {
      input: { main: 'index.html' }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  plugins: [
    {
      name: 'generate-sw',
      apply: 'build', // não roda no `vite dev`
      async closeBundle() {
        const { count, size, warnings } = await generateSW({
          globDirectory: 'dist',
          globPatterns: ['**/*.{html,js,css,svg,png,webmanifest}'],
          swDest: 'dist/sw.js',
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              // Não cachear respostas autenticadas do GitHub (token no header)
              urlPattern: /^https:\/\/api\.github\.com\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            }
          ]
        });
        warnings.forEach((w) => console.warn('[workbox]', w));
        console.log(`[workbox] precache: ${count} arquivos, ${(size / 1024).toFixed(1)} KB`);
      }
    }
  ]
});
