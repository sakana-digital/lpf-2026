import './assets/main.css'

import { createApp } from 'vue'
import { i18n } from './i18n'
import { initTheme } from '@/stores/theme'
import { initSearch } from '@/stores/search'
import { initBookmarks } from '@/stores/bookmarks'
import App from './App.vue'
import router from '@/router'

initTheme()
initSearch()
initBookmarks()

const app = createApp(App)

app.use(router)
app.use(i18n)
app.mount('#app')
