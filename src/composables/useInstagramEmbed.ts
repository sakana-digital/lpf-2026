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
