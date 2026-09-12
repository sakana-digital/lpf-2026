import { ref, watch } from 'vue'
import { readStored, writeStored } from '@shared/storage'
import { sanitizePage, type AdminPage } from '@/lib/adminPage'

const PAGE_KEY = 'admin-page'

function restore(orgs: readonly string[]): AdminPage {
  try {
    return sanitizePage(JSON.parse(readStored(PAGE_KEY) ?? 'null'), orgs)
  } catch {
    return sanitizePage(null, orgs)
  }
}

export function useAdminPage(orgs: readonly string[]) {
  const page = ref<AdminPage>(restore(orgs))

  watch(page, (value) => writeStored(PAGE_KEY, JSON.stringify(value)))

  return {
    page,
    // Replacing the whole page keeps the watcher shallow, and both fields persisted.
    select: (patch: Partial<AdminPage>) => {
      page.value = { ...page.value, ...patch }
    },
  }
}
