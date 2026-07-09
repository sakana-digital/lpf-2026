export function formatElapsed(updatedAtSec: number, nowSec: number): string {
  const diffSec = Math.max(0, nowSec - updatedAtSec)
  if (diffSec < 60) return 'たった今'
  const minutes = Math.floor(diffSec / 60)
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  return `${hours}時間前`
}
