import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import SignageView from './components/SignageView.vue'

const app = createApp(
  window.location.pathname.replace(/\/$/, '') === '/signage' ? SignageView : App,
)

app.mount('#app')
