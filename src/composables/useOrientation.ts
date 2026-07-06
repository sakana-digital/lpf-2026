import { ref } from 'vue'

export type Orientation = 'portrait' | 'landscape-left' | 'landscape-right'

// アプリ全体で共有する単一の状態
const orientation = ref<Orientation>('portrait')
let initialized = false

function resolveFromAngle(angle: number): Orientation {
  if (angle === 90) return 'landscape-left'
  if (angle === 270 || angle === -90) return 'landscape-right'
  return 'portrait'
}

function apply() {
  orientation.value = resolveFromAngle(screen.orientation.angle)
  document.documentElement.setAttribute('data-orientation', orientation.value)
}

// アプリ起動時に一度だけ呼ぶ（コンポーネントのマウントに依存させない）
export function initOrientation() {
  if (initialized) return
  initialized = true

  // 未対応ブラウザでは回転方向を判別できないため portrait 扱いのまま何もしない
  if (!screen.orientation) return

  apply()
  screen.orientation.addEventListener('change', apply)
}

export function useOrientation() {
  return { orientation }
}
