# Architecture: Jodjai (slip-based expense tracker)

Working name **Jodjai (จดใจ)**: our own name, no link to the original. Personal use.

## Stack

| layer | choice | why |
| --- | --- | --- |
| app | Vite + React + TypeScript, static build | no server needed; slips never leave the phone |
| routing | tiny hash router (`#/import`) | works on any static host with no rewrites |
| styling | plain CSS with design tokens as CSS variables (`src/styles/tokens.css`) | no build plugin, tokens in one place |
| database | IndexedDB via Dexie | on-device, survives offline, holds slip image blobs |
| QR | jsQR | decodes the slip's verification QR in the browser |
| OCR | tesseract.js 7 with `tha` + `eng` data, self-hosted under `/ocr/` | Thai OCR offline, no third-party CDN |
| PWA | hand-written `manifest.webmanifest` + `sw.js` | installable, offline, Web Share Target for slips |
| tests | Vitest (parsers), Playwright (flows) on generated synthetic slips | no real slips in the repo |
| hosting | any static host (GitHub Pages, Netlify, Vercel) | — |

No accounts, no backend, so no row-level security: the only user is whoever holds the phone.

## Schema (Dexie, version 1)

```
transactions  ++id, occurredAt, categoryId, type, source, &slipRef, imageHash
              { id, type: 'expense'|'income'|'transfer', amountSatang: int,
                occurredAt: ISO string (local time), categoryId, receiver, sender,
                bank (code), note, source: 'slip'|'manual', slipRef?, imageHash?,
                slipImageId?, confidence (0-1), createdAt, updatedAt }
categories    ++id, type, sortOrder   { id, name, emoji, color, type, sortOrder }
rules         ++id, &match            { id, match (normalised receiver), categoryId }
slipImages    ++id                    { id, blob, createdAt }
settings      key                     { key, value }  (myName, onboarded)
```

- Money: integer satang, THB only.
- `slipRef` unique: the same slip can't be saved twice. `imageHash` (SHA-256) catches the same file before OCR runs.
- Deleting a category moves its transactions to "อื่นๆ" (Other); deleting a transaction deletes its slip image.

## Modules (instead of an API)

| module | does | flow |
| --- | --- | --- |
| `slip/qr.ts` | find + parse the slip QR (EMV TLV: API id 000001, bank code, trans ref) | F01 |
| `slip/parse.ts` | OCR text → amount, date/time, receiver, sender, bank, confidence | F01 |
| `slip/ocr.ts` | preprocess image (scale, grayscale) + tesseract worker, reused | F01 |
| `slip/pipeline.ts` | file → hash → dedupe → QR → OCR → parse → draft | F01 |
| `db/*.ts` | CRUD, summaries by day and category, rules, export/backup | F02-F05 |

## Parts that bite

- **Dates:** slips print Buddhist-era years, 2 or 4 digits (`68`, `2568`), Thai month abbreviations, sometimes CE. Store local time; the app is single-time-zone (Asia/Bangkok).
- **OCR errors:** Thai OCR misreads, so every slip goes through the review screen with low-confidence fields flagged. Never auto-save without review.
- **Fee vs amount vs balance:** the parser ignores lines with ค่าธรรมเนียม / fee / คงเหลือ / balance.
- **Income vs expense:** default expense. If the receiver matches "my name" from settings, it's income; if sender and receiver are both me, it's a transfer and is left out of totals.
- **Storage:** slip images can be large; store a downscaled JPEG (max 1200px), not the original.
- **Share target:** the service worker must catch the POST, park the files in Cache Storage and redirect; the page picks them up.

## Build order

1. Vertical slice: S03 import → S04 review → S02 home (QR + OCR + parse + save).
2. Must-haves: S06 manual add, S05 edit/delete, S07 monthly summary, categories defaults.
3. Should-haves: rules (auto-categorise), income/transfer detection, daily chart, CSV export, JSON backup/restore, PWA + share target, S01 onboarding.
4. Could-haves: S08 custom categories, search, dark mode.
