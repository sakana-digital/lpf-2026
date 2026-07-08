import { fileURLToPath, URL } from 'node:url'

import { defineConfig, lazyPlugins } from 'vite-plus'
import vue from '@vitejs/plugin-vue'

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
  plugins: lazyPlugins(() => [vue()]),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
