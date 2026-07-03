import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { WritableComputedRef } from 'vue'
import { i18n } from '../i18n'
import { getLastExploreTab, setLastExploreTab } from '../composables/useExploreTab'
import HomeView from '../views/HomeView.vue'
import ExploreView from '../views/ExploreView.vue'
import ExploreMapTab from '../components/ExploreMapTab.vue'
import ExploreEventsTab from '../components/ExploreEventsTab.vue'
import ExploreNodesTab from '../components/ExploreNodesTab.vue'
import NotFoundView from '../views/NotFoundView.vue'

function exploreRoutes(suffix: string): RouteRecordRaw {
  return {
    path: 'explore',
    component: ExploreView,
    children: [
      { path: '', redirect: () => ({ name: `explore-${getLastExploreTab()}${suffix}` }) },
      {
        path: 'map',
        name: `explore-map${suffix}`,
        component: ExploreMapTab,
        meta: { title: 'explore.tabs.map' },
      },
      {
        path: 'events',
        name: `explore-events${suffix}`,
        component: ExploreEventsTab,
        meta: { title: 'explore.tabs.events' },
      },
      {
        path: 'nodes',
        name: `explore-nodes${suffix}`,
        component: ExploreNodesTab,
        meta: { title: 'explore.tabs.nodes' },
      },
    ],
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    { ...exploreRoutes(''), path: '/explore' },
    {
      path: '/en',
      meta: { locale: 'en' },
      children: [
        {
          path: '',
          name: 'home-en',
          component: HomeView,
        },
        exploreRoutes('-en'),
        {
          path: ':pathMatch(.*)*',
          name: 'not-found-en',
          component: NotFoundView,
          meta: { title: 'notFound.title' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: { title: 'notFound.title' },
    },
  ],
})

router.beforeEach((to) => {
  const isEn = to.path === '/en' || to.path.startsWith('/en/')
  ;(i18n.global.locale as WritableComputedRef<string>).value = isEn ? 'en' : 'ja'
})

router.afterEach((to) => {
  const key = to.meta.title as string | undefined
  const suffix = i18n.global.t('pageTitle.suffix')
  document.title = key ? `${i18n.global.t(key)} | ${suffix}` : suffix

  const tabMatch = to.name?.toString().match(/^explore-(map|events|nodes)(?:-en)?$/)
  if (tabMatch) setLastExploreTab(tabMatch[1] as 'map' | 'events' | 'nodes')
})

export default router
