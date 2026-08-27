import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { WritableComputedRef } from 'vue'
import { findPage, isEnPath, localizedPath } from '@/config/pages'
import { i18n } from '@/i18n'
import { EXPLORE_TABS, getLastExploreTab, setLastExploreTab } from '@/lib/exploreTab'
import type { ExploreTab } from '@/lib/exploreTab'
import HomeView from '@/views/HomeView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** PageHeader の見出しに使うロケールキー */
    pageTitle?: string
    locale?: 'en'
  }
}

const NewsView = () => import('@/views/NewsView.vue')
const ExploreView = () => import('@/views/ExploreView.vue')
const ExploreEventsTab = () => import('@/components/explore/ExploreEventsTab.vue')
const ExploreScheduleTab = () => import('@/components/explore/ExploreScheduleTab.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

function exploreRoutes(suffix: string): RouteRecordRaw {
  return {
    path: 'explore',
    component: ExploreView,
    meta: { pageTitle: 'sitemap.explore' },
    children: [
      { path: '', redirect: () => ({ name: `explore-${getLastExploreTab()}${suffix}` }) },
      {
        path: 'events',
        name: `explore-events${suffix}`,
        component: ExploreEventsTab,
      },
      {
        path: 'schedule',
        name: `explore-schedule${suffix}`,
        component: ExploreScheduleTab,
      },
      {
        path: 'map',
        name: `explore-map${suffix}`,
        component: () => import('@/components/explore/ExploreMapTab.vue'),
      },
      {
        path: 'nodes',
        redirect: (to) => ({
          name: `explore-events${suffix}`,
          query: { ...to.query, view: 'graph' },
        }),
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
      meta: { pageTitle: 'sitemap.news' },
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
          meta: { pageTitle: 'sitemap.news' },
        },
        exploreRoutes('-en'),
        {
          path: ':pathMatch(.*)*',
          name: 'not-found-en',
          component: NotFoundView,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

router.beforeEach((to) => {
  if (!to.path.endsWith('/')) {
    return { path: `${to.path}/`, query: to.query, hash: to.hash }
  }
})

router.beforeEach((to) => {
  const isEn = isEnPath(to.path)
  ;(i18n.global.locale as WritableComputedRef<string>).value = isEn ? 'en' : 'ja'
  document.documentElement.lang = isEn ? 'en' : 'ja'
})

// タイトルは middleware と同じ config/pages + meta.pages.* から引き、SSR と SPA でズレないようにする
router.afterEach((to) => {
  const { jaPath } = localizedPath(to.path)
  const page = findPage(jaPath)
  const suffix = i18n.global.t('pageTitle.suffix')
  const title = page
    ? i18n.global.te(`meta.pages.${page.metaKey}.title`)
      ? i18n.global.t(`meta.pages.${page.metaKey}.title`)
      : undefined
    : i18n.global.t('meta.notFound.title')
  document.title = title ? `${title} | ${suffix}` : suffix

  const tabMatch = to.name?.toString().match(/^explore-([a-z]+)(?:-en)?$/)
  if (tabMatch && (EXPLORE_TABS as readonly string[]).includes(tabMatch[1]!)) {
    setLastExploreTab(tabMatch[1] as ExploreTab)
  }
})

export default router
