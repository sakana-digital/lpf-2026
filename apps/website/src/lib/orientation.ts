// 端末の物理的な上辺がどちらを向いているかを html[data-orientation] に載せるだけのモジュール。
// 消費するのは CSS のみで、landscape 時にヘッダーを上辺側の縦レールへ寄せるのに使う。
// @media (orientation: landscape) では左右を区別できないため、ここは JS でしか判定できない。
// screen.orientation 未対応のブラウザでは portrait のまま = 通常の上部ヘッダーにフォールバックする。
let initialized = false

function apply() {
  const angle = screen.orientation.angle
  const value = angle === 90 ? 'landscape-left' : angle === 270 ? 'landscape-right' : 'portrait'
  document.documentElement.setAttribute('data-orientation', value)
}

// アプリ起動時に一度だけ呼ぶ（コンポーネントのマウントに依存させない）
export function initOrientation() {
  if (initialized) return
  initialized = true

  if (!screen.orientation) return

  apply()
  screen.orientation.addEventListener('change', apply)
}
