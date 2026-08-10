import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isRootPath } from '@shared/pages'

export function useIsRoot() {
  const route = useRoute()
  return computed(() => isRootPath(route.path))
}
