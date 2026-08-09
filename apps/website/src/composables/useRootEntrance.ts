const rootPaths = ['/', '/en', '/en/']

// Whether the session started by landing directly on the root page,
// rather than reaching it through in-app navigation. Captured once at
// load, before the router touches history, so it reflects the entry URL.
const direct = window.history.state?.back == null && rootPaths.includes(window.location.pathname)

let homeConsumed = false

// Stable across the session; safe for persistent components (e.g. header).
export function isDirectRootEntrance(): boolean {
  return direct
}

// Same signal, but consumed so a remounting view plays the entrance only
// on the initial landing, not on later in-app visits to home.
export function consumeDirectRootEntrance(): boolean {
  if (!direct || homeConsumed) return false
  homeConsumed = true
  return true
}
