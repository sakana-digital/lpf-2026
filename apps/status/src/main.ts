import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import SignageView from './components/SignageView.vue'

const isSignage = window.location.pathname.replace(/\/$/, '') === '/signage'

if (isSignage) document.title = 'サイネージ | 八宝祭 - LiSA Papillon Festival 2026'

const app = createApp(isSignage ? SignageView : App)

app.mount('#app')
