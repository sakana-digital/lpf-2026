import { ref } from 'vue'

function copyWithFallback(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, text.length)
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function useCopyLink() {
  const copied = ref(false)
  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  async function copyLink(url: string) {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        copyWithFallback(url)
      }
    } else {
      copyWithFallback(url)
    }
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 1500)
  }

  return { copied, copyLink }
}
