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

- `/explore` redirects to the last tab (localStorage `explore-last-tab`); tabs: map / events / schedule, English mirror under `/en/explore/...`. `/explore/nodes` is a redirect to `/explore/events?view=graph`, not a tab.
- Events grid: click a `.events-grid .cell .cell-head` → row/column expand + `?org=<id>` in URL; deep link `/explore/events?org=c1-3` expands on load.
- Schedule: click a `.slot.linked .slot-trigger` to expand; the detail sits outside the trigger.
- Map tab: floor buttons `1F`〜`4F` / `全体` (2D canvas); leave the tab and return to exercise dispose/remount.
- Graph view (`/explore/events?view=graph`): drag inside `.nodes .viewport` with mouse down/move/up to rotate; click a leaf `.node` for the detail panel.
- Bookmarks: `.bookmark-toggle` in an expanded cell writes localStorage `bookmarks`. The only place the list renders is the header menu: `.menu-dropdown .icon-button` (`メニュー`) → `.bookmarks-menu .icon-button` (`ブックマークを開閉`) → `#bookmarks-list`. Empty shows a `.empty` row and the `.count` badge is absent. There is no bookmarks sidebar.
- Home TOC: `.toc` (scroll-spy) is fixed to the right of the content column and is `display: none` below 1440px, `flex` at ≥1440px; the highlight is `.toc-link.is-active` and clicking one smooth-scrolls and rewrites the hash.
- Dark theme: `page.addInitScript(() => localStorage.setItem('theme', 'dark'))` before goto.

## Gotchas

- Many buttons share an accessible name — `getByRole('button', { name: ... })` hits strict-mode violations; prefer class locators (`.cell-head`, `.bookmark-toggle`).
- `document.querySelectorAll('button button')` must stay empty; nested buttons get restructured by the parser and move the bookmark control out of its cell.
- Capture console errors: `page.on('pageerror', ...)` / `console` type `error`; the SPA should produce none. A 502 on `/api/status` just means the `apps/status` worker is not running locally.
- 320px viewport: check `document.documentElement.scrollWidth <= clientWidth` (no horizontal overflow).
