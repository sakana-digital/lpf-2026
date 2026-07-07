import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { WritableComputedRef } from 'vue'
import { i18n } from '@/i18n'
import { EXPLORE_TABS, getLastExploreTab, setLastExploreTab } from '@/composables/useExploreTab'
import type { ExploreTab } from '@/composables/useExploreTab'
import HomeView from '@/views/HomeView.vue'

const NewsView = () => import('@/views/NewsView.vue')
const ExploreView = () => import('@/views/ExploreView.vue')
const ExploreEventsTab = () => import('@/components/explore/ExploreEventsTab.vue')
const ExploreScheduleTab = () => import('@/components/explore/ExploreScheduleTab.vue')
const ExploreNodesTab = () => import('@/components/explore/ExploreNodesTab.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

function exploreRoutes(suffix: string): RouteRecordRaw {
  return {
    path: 'explore',
    component: ExploreView,
    meta: { pageTitle: 'sitemap.explore' },
    children: [
      { path: '', redirect: () => ({ name: `explore-${getLastExploreTab()}${suffix}` }) },
      {
        path: 'map',
        name: `explore-map${suffix}`,
        component: () => import('@/components/explore/ExploreMapTab.vue'),
        meta: { title: 'explore.tabs.map' },
      },
      {
        path: 'events',
        name: `explore-events${suffix}`,
        component: ExploreEventsTab,
        meta: { title: 'explore.tabs.events' },
      },
      {
        path: 'schedule',
        name: `explore-schedule${suffix}`,
        component: ExploreScheduleTab,
        meta: { title: 'explore.tabs.schedule' },
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
    {
      path: '/news',
      name: 'news',
      component: NewsView,
      meta: { pageTitle: 'sitemap.news', title: 'search.titles.news' },
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
        {
          path: 'news',
          name: 'news-en',
          component: NewsView,
          meta: { pageTitle: 'sitemap.news', title: 'search.titles.news' },
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

  const tabMatch = to.name?.toString().match(/^explore-([a-z]+)(?:-en)?$/)
  if (tabMatch && (EXPLORE_TABS as readonly string[]).includes(tabMatch[1]!)) {
    setLastExploreTab(tabMatch[1] as ExploreTab)
  }
})

export default router
