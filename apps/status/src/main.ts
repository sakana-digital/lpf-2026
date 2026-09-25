import './assets/main.css'

import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import SignageView from './components/SignageView.vue'

const isSignage = window.location.pathname.replace(/\/$/, '') === '/signage'
// Browsers only look for a new worker on navigation, which a signage left running never does.
const SW_UPDATE_MS = 5 * 60_000

if (isSignage) {
  document.title = 'サイネージ | 八宝祭 - LiSA Papillon Festival 2026'
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => void registration.update().catch(() => {}), SW_UPDATE_MS)
    },
  })
  // Without this the browser may evict the cached video when storage runs low.
  void navigator.storage?.persist()
}

const app = createApp(isSignage ? SignageView : App)

app.mount('#app')
