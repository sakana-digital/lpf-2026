---
name: verify
description: Verify changes to this Vue SPA by driving the dev server with Playwright and capturing screenshots.
---

# Verify (lpf-2026)

## Handle

- Dev server: the user usually runs `vp dev` already at `http://localhost:5173` — probe with `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` before starting your own.
- Static checks (not verification, only pre-commit): `bun run type-check`, `bun run build`.
- Browser driving: Playwright via bun in the scratchpad dir:
  ```bash
  bunx playwright install chromium
  bun <script>.mjs   # import { chromium } from 'playwright'
  ```

## Flows worth driving

- `/explore` redirects to the last tab (localStorage `explore-last-tab`); tabs: events / timetable, English mirror under `/en/explore/...`. `/explore/nodes` and `/explore/schedule` are redirects (to `/explore/events` and `/explore/timetable`), not tabs.
- Events grid: `?by=category` regroups the rows by category (`.segmented-switch` above the grid); the default lists grades, clubs and committees. Click a `.events-grid .cell .cell-head` → row/column expand + `?org=<id>` in URL; deep link `/explore/events?org=c1-3` expands on load.
- Timetable: click a `.slot.linked .slot-trigger` to expand; the detail sits outside the trigger.
- Bookmarks: `.bookmark-toggle` in an expanded cell writes localStorage `bookmarks`. The only place the list renders is the header dropdown: `.bookmarks-dropdown .icon-button` (`ブックマーク`) → `#header-bookmarks`, whose `.caption` always reads `ブックマーク: {count}`. There is no bookmarks sidebar and no menu dropdown.
- Language: the only switch is `.language-toggle` in the site footer (`Footer.vue`, mounted in App.vue after RouterView, so it is on every page); it links to the other locale.
- Theme always follows the system: drive it with `browser.newContext({ colorScheme: 'dark' })` or `page.emulateMedia({ colorScheme: 'dark' })`; there is no toggle and nothing is stored.

## Gotchas

- Many buttons share an accessible name — `getByRole('button', { name: ... })` hits strict-mode violations; prefer class locators (`.cell-head`, `.bookmark-toggle`).
- `document.querySelectorAll('button button')` must stay empty; nested buttons get restructured by the parser and move the bookmark control out of its cell.
- Capture console errors: `page.on('pageerror', ...)` / `console` type `error`; the SPA should produce none. A 502 on `/api/status` just means the `apps/status` worker is not running locally.
- 320px viewport: check `document.documentElement.scrollWidth <= clientWidth` (no horizontal overflow).
