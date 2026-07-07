declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

let loadPromise: Promise<void> | undefined

function loadEmbedScript(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve) => {
    if (window.instgrm) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = '//www.instagram.com/embed.js'
    script.async = true
    script.addEventListener('load', () => resolve(), { once: true })
    document.body.appendChild(script)
  })

  return loadPromise
}

export async function processInstagramEmbeds() {
  await loadEmbedScript()
  window.instgrm?.Embeds.process()
}

export function processInstagramEmbedsNear(el: Element, rootMargin = '400px') {
  if (!('IntersectionObserver' in window)) {
    processInstagramEmbeds()
    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        processInstagramEmbeds()
      }
    },
    { rootMargin },
  )
  observer.observe(el)

  return () => observer.disconnect()
}
