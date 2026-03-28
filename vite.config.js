import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mascots.png', 'david-sheet.png', 'denathor.png', 'wilson.png', 'sword.png'],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:3001\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'The Counsel',
        short_name: 'The Counsel',
        description: 'Your personal finance crew',
        theme_color: '#1a1a1a',
        background_color: '#faf9f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
