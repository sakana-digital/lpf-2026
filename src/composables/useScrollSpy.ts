import { onMounted, onUnmounted, ref, type Ref } from 'vue'

interface ScrollSpy {
  activeId: Ref<string>
  // Pin the active id while a programmatic (smooth) scroll is in flight, so the
  // spy does not highlight sections the scroll merely passes through.
  select: (id: string) => void
}

// Tracks which of the given section ids is currently active for a table of
// contents. An activation line plus a hysteresis band keeps the highlight from
// flickering between two sections when a heading hovers around the line.
export function useScrollSpy(ids: string[]): ScrollSpy {
  const activeId = ref(ids[0] ?? '')
  let elements: HTMLElement[] = []
  let frame = 0
  let locked = false
  let settleTimer = 0

  function select(id: string) {
    activeId.value = id
    locked = true
    // Unlock once the scroll settles; onScroll keeps pushing this back while
    // the smooth scroll is still moving, and this fallback covers the case
    // where the target needs no scrolling at all.
    clearTimeout(settleTimer)
    settleTimer = window.setTimeout(() => {
      locked = false
    }, 150)
  }

  function update() {
    frame = 0
    if (locked || elements.length === 0) return

    // Activation line sits in the upper third of the viewport; the hysteresis
    // band below it is the dead zone where the active section does not change.
    const line = window.innerHeight * 0.35
    const hysteresis = window.innerHeight * 0.15
    const sections = elements.map((el) => ({ id: el.id, top: el.getBoundingClientRect().top }))

    // The last section is too short to ever reach the activation line, so treat
    // reaching the bottom of the page as activating it.
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
    if (atBottom) {
      activeId.value = sections[sections.length - 1]!.id
      return
    }

    const currentIndex = Math.max(
      0,
      sections.findIndex((s) => s.id === activeId.value),
    )

    // Scrolling down: activate as soon as a heading crosses the line.
    let eager = 0
    sections.forEach((s, i) => {
      if (s.top <= line) eager = i
    })
    if (eager > currentIndex) {
      activeId.value = sections[eager]!.id
      return
    }

    // Scrolling up: only fall back once the next heading has dropped a full
    // hysteresis band below the line, so small jitters keep the current one.
    let lazy = 0
    sections.forEach((s, i) => {
      if (s.top <= line + hysteresis) lazy = i
    })
    if (lazy < currentIndex) activeId.value = sections[lazy]!.id
  }

  function onScroll() {
    if (locked) {
      clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        locked = false
      }, 150)
      return
    }
    if (frame) return
    frame = requestAnimationFrame(update)
  }

  onMounted(() => {
    elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    update()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    if (frame) cancelAnimationFrame(frame)
    clearTimeout(settleTimer)
  })

  return { activeId, select }
}
