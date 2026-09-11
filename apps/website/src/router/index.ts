import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { WritableComputedRef } from 'vue'
import {
  findPage,
  isEnPath,
  labelKey,
  LANGUAGES,
  legacyPages,
  localePath,
  localizedPath,
  pagePath,
} from '@/data/pages'
import type { Language } from '@/data/pages'
import { i18n } from '@/i18n'
import { EXPLORE_TABS, getLastExploreTab, setLastExploreTab } from '@/lib/exploreTab'
import type { ExploreTab } from '@/lib/exploreTab'
import HomeView from '@/views/HomeView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Locale key for the PageHeader heading */
    pageTitle?: string
  }
}

const NewsView = () => import('@/views/NewsView.vue')
const ExploreView = () => import('@/views/ExploreView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

const tabViews = {
  events: () => import('@/components/explore/ExploreEventsTab.vue'),
  timetable: () => import('@/components/explore/ExploreTimetableTab.vue'),
} satisfies Record<ExploreTab, unknown>

const explorePath = pagePath('explore')

/** Path relative to the explore route, which holds the tabs as child routes. */
function exploreChildPath(path: string): string {
  return path.slice(explorePath.length)
}

function exploreRoute(language: Language, suffix: string): RouteRecordRaw {
  return {
    path: localePath(explorePath, language),
    component: ExploreView,
    meta: { pageTitle: labelKey('explore') },
    children: [
      {
        path: '',
        redirect: (to) => ({ name: `explore-${getLastExploreTab()}${suffix}`, query: to.query }),
      },
      ...EXPLORE_TABS.map(
        (tab): RouteRecordRaw => ({
          path: exploreChildPath(pagePath(tab)),
          name: `explore-${tab}${suffix}`,
          component: tabViews[tab],
        }),
      ),
      ...legacyPages.map(
        (page): RouteRecordRaw => ({
          path: exploreChildPath(page.path),
          redirect: (to) => ({ name: `explore-${page.id}${suffix}`, query: to.query }),
        }),
      ),
    ],
  }
}

function localeRoutes(language: Language): RouteRecordRaw[] {
  const suffix = language === 'en' ? '-en' : ''
  return [
    {
      path: localePath(pagePath('home'), language),
      name: `home${suffix}`,
      component: HomeView,
    },
    {
      path: localePath(pagePath('news'), language),
      name: `news${suffix}`,
      component: NewsView,
      meta: { pageTitle: labelKey('news') },
    },
    exploreRoute(language, suffix),
    {
      path: `${localePath('/', language)}:pathMatch(.*)*`,
      name: `not-found${suffix}`,
      component: NotFoundView,
    },
  ]
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: LANGUAGES.flatMap(localeRoutes),
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

// Titles come from the same data/pages + meta.pages.* as the middleware, so SSR and SPA agree
router.afterEach((to) => {
  const { jaPath } = localizedPath(to.path)
  const page = findPage(jaPath)
  const suffix = i18n.global.t('pageTitle.suffix')
  const title = page
    ? i18n.global.te(`meta.pages.${page.id}.title`)
      ? i18n.global.t(`meta.pages.${page.id}.title`)
      : undefined
    : i18n.global.t('meta.notFound.title')
  document.title = title ? `${title} | ${suffix}` : suffix

  const tabMatch = to.name?.toString().match(/^explore-([a-z]+)(?:-en)?$/)
  if (tabMatch && (EXPLORE_TABS as readonly string[]).includes(tabMatch[1]!)) {
    setLastExploreTab(tabMatch[1] as ExploreTab)
  }
})

export default router
