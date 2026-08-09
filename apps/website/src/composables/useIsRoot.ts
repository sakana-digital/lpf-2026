import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useIsRoot() {
  const route = useRoute()
  return computed(() => ['/', '/en', '/en/'].includes(route.path))
}
