import { ref } from 'vue'

// A single state shared across the whole app
const isOpen = ref(false)
let initialized = false

export function open() {
  isOpen.value = true
}

export function close() {
  isOpen.value = false
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

// Call once on startup, so it does not depend on a component mounting
export function initSearch() {
  if (initialized) return
  initialized = true

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen.value) {
      close()
      return
    }
    if (event.key !== '/') return
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
    if (isTypingTarget(event.target)) return
    event.preventDefault()
    open()
  })
}

export function useSearch() {
  return { isOpen, open, close }
}
