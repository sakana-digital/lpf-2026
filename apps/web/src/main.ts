import './assets/main.css'

import { createApp } from 'vue'
import { i18n } from './i18n'
import { initTheme } from '@/composables/useTheme'
import { initSearch } from '@/composables/useSearch'
import { initOrientation } from '@/composables/useOrientation'
import { initBookmarks } from '@/composables/useBookmarks'
import App from './App.vue'
import router from '@/router'

initTheme()
initSearch()
initOrientation()
initBookmarks()

const app = createApp(App)

app.use(router)
app.use(i18n)
app.mount('#app')
