import { pages as allPages } from '@shared/pages'
import type { PageDefinition } from '@shared/pages'

export type { PageDefinition }

/** PageTree / SearchModal に出すページ。先頭がルート。 */
export const pages: PageDefinition[] = allPages.filter((page) => page.navigable)
