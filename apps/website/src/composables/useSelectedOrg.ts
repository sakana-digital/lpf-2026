import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganization } from '@/config/organizations'

/**
 * 選択中の団体を `?org=` で持つ。存在しない ID は未選択として扱う。
 * explore の 3 タブが同じクエリを読み書きする。
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
