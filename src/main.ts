import './assets/main.css'

import { createApp, vaporInteropPlugin } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router'
import ja from './locales/ja.json'

const i18n = createI18n({
  legacy: false,
  locale: 'ja',
  messages: { ja },
})

const app = createApp(App)

app.use(router)
app.use(vaporInteropPlugin)
app.use(i18n)
app.mount('#app')
