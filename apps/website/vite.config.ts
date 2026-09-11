import { fileURLToPath, URL } from 'node:url'

import { defineConfig, lazyPlugins } from 'vite-plus'
import type { Plugin } from 'vite-plus'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { localePath, pages } from './src/data/pages'

/** Builds the Cloudflare Pages _redirects from src/data/pages.ts. */
export function redirectRules(): string {
  const trailingSlash = pages
    .flatMap((page) => [page.path, localePath(page.path, 'en')])
    .map((path) => path.replace(/\/$/, ''))
    .filter(Boolean)
    .map((path) => `${path} ${path}/ 301`)

  return [...trailingSlash, '/* /index.html 200', ''].join('\n')
}

function emitRedirects(): Plugin {
  return {
    name: 'lpf-emit-redirects',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_redirects', source: redirectRules() })
    },
  }
}

// https://vite.dev/config/
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
  build: {
    // The small thumbnails stay files, so the intro sweep fetches them instead of the bundle carrying them
    assetsInlineLimit: (file) => (file.includes('/assets/orgs/') ? false : undefined),
  },
  plugins: lazyPlugins(() => [vue(), vueDevTools(), emitRedirects()]),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../../shared', import.meta.url)),
    },
  },
})
