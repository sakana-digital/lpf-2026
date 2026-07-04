import './assets/main.css'

import { createApp, vaporInteropPlugin } from 'vue'
import { i18n } from './i18n'
import { initTheme } from '@/composables/useTheme'
import { initSearch } from '@/composables/useSearch'
import { initOrientation } from '@/composables/useOrientation'
import App from './App.vue'
import router from '@/router'

initTheme()
initSearch()
initOrientation()

const app = createApp(App)

app.use(router)
app.use(vaporInteropPlugin)
app.use(i18n)
app.mount('#app')
