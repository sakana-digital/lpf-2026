import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganization } from '@/data/organizations'

/**
 * Holds the selected group in `?org=`. An unknown ID counts as no selection.
 * The three explore tabs read and write the same query.
 */
export function useSelectedOrg() {
  const route = useRoute()
  const router = useRouter()

  const selectedId = computed(() => {
    const org = route.query.org
    return typeof org === 'string' && getOrganization(org) ? org : undefined
  })

  const selectedOrg = computed(() =>
    selectedId.value ? getOrganization(selectedId.value) : undefined,
  )

  function select(id: string | null | undefined) {
    return router.replace({ query: { ...route.query, org: id ?? undefined } })
  }

  function toggle(id: string) {
    return select(id === selectedId.value ? undefined : id)
  }

  return { selectedId, selectedOrg, select, toggle }
}
