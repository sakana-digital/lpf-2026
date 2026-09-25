import { fileURLToPath, URL } from 'node:url'

import { defineConfig, lazyPlugins } from 'vite-plus'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  fmt: {
    semi: false,
    singleQuote: true,
  },
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  preview: {
    host: true,
  },
  plugins: lazyPlugins(() => [
    vue(),
    // Only the signage runs offline; the group and admin pages stay online-only.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'sw',
      filename: 'sw.ts',
      scope: '/signage',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png}'] },
    }),
  ]),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../../shared', import.meta.url)),
      '@styled': fileURLToPath(new URL('./styled-system', import.meta.url)),
    },
  },
})
