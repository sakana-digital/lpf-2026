import { onMounted, onUnmounted, ref, type Ref } from 'vue'

// Tracks which of the given section ids is currently the most prominent in the
// viewport, so a table of contents can highlight the active section.
export function useScrollSpy(ids: string[]): Ref<string> {
  const activeId = ref(ids[0] ?? '')
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    const visible = new Set<string>()

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        // Keep document order so the topmost visible section wins.
        const current = ids.find((id) => visible.has(id))
        if (current) activeId.value = current
      },
      // Offset the top by the fixed header so a section counts as active once
      // it clears the header, not when it merely touches the viewport edge.
      { rootMargin: '-48px 0px -55% 0px' },
    )

    elements.forEach((el) => observer!.observe(el))
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return activeId
}
