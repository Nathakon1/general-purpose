# Build log

| ID | date | status | notes |
| --- | --- | --- | --- |
| shell | 2026-11-24 | done | Vite + React + TS, hash router, tokens, bottom nav, toast, dialog |
| S03+S04 | 2026-11-24 | done | one route `#/import`: pick/drop/share slips, progress, review cards with confidence flags, dedupe by file hash and slip ref. Harder than expected: Thai OCR drops spaces after titles (fixed in parser) |
| S02 | 2026-11-24 | done | today + month totals, list grouped by day, empty and loading states |
| S06 | 2026-11-24 | done | manual add, validation, future-date warning, remember category for payee |
| S05 | 2026-11-24 | done | edit, delete with confirm, source slip image + ref. Bug found by e2e: dialog buttons submitted the form; fixed |
| S07 | 2026-11-24 | done | month switcher, expense/income toggle, donut, category list with drill-down, daily bars, average per day |
| S08 | 2026-11-24 | done | add/edit/delete categories (moves entries to อื่นๆ), list and remove payee rules |
| S09 | 2026-11-24 | done | my name, theme, CSV export, JSON backup/restore, clear all |
| S01 | 2026-11-24 | done | 3 intro steps + optional name |
| PWA | 2026-11-24 | done | manifest, icons, offline service worker, Web Share Target |

Tests: 16 unit (Vitest), 3 flow tests (Playwright, Pixel 7) on synthetic slips from 3 made-up layouts. Real slips from all 16 banks are not tested: OCR accuracy on real slips is the main unknown.
