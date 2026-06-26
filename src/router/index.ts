import { createRouter, createWebHistory } from 'vue-router'
import { i18n } from '../i18n'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
  ],
})

router.afterEach((to) => {
  const key = to.meta.title as string | undefined
  const suffix = i18n.global.t('pageTitle.suffix')
  document.title = key ? `${i18n.global.t(key)} | ${suffix}` : suffix
})

export default router
