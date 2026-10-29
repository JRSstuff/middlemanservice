import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'SafeSwap - Escrow & Middleman',
        short_name: 'SafeSwap',
        description: 'Safe, regulated escrow transactions between buyers and sellers.',
        theme_color: '#1F2A14',
        background_color: '#FFFFE8',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'New Deal',
            short_name: 'New Deal',
            description: 'Create a new escrow transaction',
            url: '/deals/new',
            icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View active and completed escrow deals',
            url: '/',
            icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching for external fonts & static resources
        runtimeCaching: [
          {
            // Do NOT cache Supabase auth endpoints or functions
            urlPattern: /.*supabase\.co\/auth\/.*/,
            handler: 'NetworkOnly',
          },
          {
            // Stale-while-revalidate for static assets
            urlPattern: ({ request }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'font' ||
              request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'safeswap-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
