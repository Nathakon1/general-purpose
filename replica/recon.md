# Recon map: MeowJot / เหมียวจด (Android, iOS)

Scope: core loop only — read bank transfer slips, record expenses automatically, categorise, daily and monthly summaries. On-device, no accounts, no subscription.
Platform for the clone: web app / PWA (Next.js), installable on a phone.
For: personal use and learning. Not for sale, so no rebrand step yet, but the clone does not use the name "เหมียวจด/MeowJot", its cat mascot, its art or its copy.
Date: 2026-11-22

## Sources

The Play Store listing (play.google.com) is blocked by this session's network policy, so this map comes from public news coverage found by web search. Screens and flows are **inferred**. Add screenshots to `replica/screens/` later to firm them up.

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | app store listing | https://play.google.com/store/apps/details?id=tech.kbtg.meowjot | not reachable from this session |
| 2 | news: launch | https://thestandard.co/meowjot/ | launched 2566 (2023), KBTG Labs + Beacon Interface |
| 3 | news: launch | https://brandinside.asia/meowjot-kbtg/ | auto expense logging from slips |
| 4 | news: subscription | https://brandinside.asia/meowjot-subscription | Silver 79 ฿/mo, Gold 149 ฿/mo, free tier exists |
| 5 | news: 16 banks | https://brandinside.asia/?p=183715 | supports slips from 16 major Thai bank apps |
| 6 | news | https://www.posttoday.com/smart-life/733620 | coverage |
| 7 | news | https://www.prachachat.net/?p=1669190 | coverage |
| 8 | news | https://marketeeronline.co/archives/381749 | coverage |

## Core loop

You transfer money in a bank app, the slip image lands in your photo gallery, and the app reads it and records the expense for you, then shows where your money went today and this month.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Onboarding | first launch | explain, ask for photo permission | pager, CTA button | first run (guess) |
| S02 | Home / today | `/` | today's total, recent transactions, quick add | summary card, transaction list, FAB | empty, filled (guess) |
| S03 | Import slips | `/import` | pick slip images (web: file picker / share target) | multi-image picker, progress | idle, processing, done, error |
| S04 | Review detected | `/import/review` | confirm what was read: amount, date, receiver, bank, category | editable rows, confidence flag, duplicate warning | all good, low confidence, duplicate |
| S05 | Transaction detail | `/t/[id]` | view / edit / delete one entry, see source slip | form, slip thumbnail | view, edit |
| S06 | Add manually | `/new` | enter an expense or income by hand | amount pad, category grid, date, note | blank, validation error |
| S07 | Monthly summary | `/summary` | totals by category and by day for a month | month switcher, donut chart, daily bars, category list | empty month, filled |
| S08 | Categories | `/settings/categories` | add / rename / recolour categories, receiver→category rules | list, colour/icon picker | default set, custom |
| S09 | Settings | `/settings` | export CSV, backup/restore JSON, clear data | list rows, confirm dialog | — |

## Flows

```
F01 Log expenses from slips (the core loop)
    S02 -> S03 pick slips -> S04 review -> S02 updated
    happy path clicks: 4 (import, select images, confirm all, done)
    edge: not a slip image, unsupported bank layout, OCR misreads amount,
          same slip imported twice (dedupe on trans ref from slip QR),
          slip date in another month, incoming transfer (income, not expense)

F02 Add an expense by hand
    S02 -> S06 -> S02
    happy path clicks: 3 + typing
    edge: zero / negative amount, future date

F03 Fix a wrong entry
    S02 -> S05 edit -> save
    edge: change category -> offer "always use this category for this receiver"

F04 See where the money went this month
    S02 -> S07 -> tap category -> filtered list
    edge: empty month, month with only income

F05 Back up / export
    S09 -> export CSV | backup JSON | restore JSON
    edge: restore over existing data, malformed file
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost, danger | default, pressed, disabled, loading | all |
| Summary card | today, month | empty, filled | S02, S07 |
| Transaction row | expense, income, from-slip, manual | default, low-confidence | S02, S04, S07 |
| Category chip / grid | — | selected, unselected | S04, S06, S08 |
| Amount input | keypad | empty, invalid | S06, S05 |
| Month switcher | — | — | S07 |
| Donut chart, daily bar chart | — | empty, filled | S07 |
| Image picker + progress | — | idle, processing, error | S03 |
| Confirm dialog | default, destructive | — | S05, S09 |
| Bottom nav | 3 tabs (Home, Summary, Settings) | active | all |

## Inferred data model

```
Transaction  id, type (expense | income), amount_satang (int), occurred_at,
             category_id, receiver_name, receiver_account_masked,
             sender_bank, note, source (slip | manual),
             slip_ref (trans ref from slip QR, unique, nullable),
             slip_image_id (nullable), ocr_confidence (0-1)
             evidence: sources 2-5 (auto logging from slips, daily/monthly summaries)
             confidence: high for the idea, guess for exact fields

Category     id, name, colour, icon, type (expense | income), sort_order
             evidence: expense apps generally; summaries by category
             confidence: medium

ReceiverRule id, match (receiver name / account), category_id
             evidence: none, our addition for auto-categorising
             confidence: guess

SlipImage    id, blob (stored on device, IndexedDB), created_at
             confidence: guess
```

Relationships: Category 1-n Transaction, Category 1-n ReceiverRule, SlipImage 1-1 Transaction.

## How slip reading works (clean-room plan)

- Thai transfer slips carry a small verification QR. It encodes the sending bank and the transaction reference, **not** the amount. Use it to detect "this is a slip" and to dedupe.
- Amount, date/time and receiver come from OCR of the image (Thai + English), with per-bank layout hints for the 16 major bank apps added over time.
- Everything runs in the browser. No slip leaves the device.

## Feature matrix

See `features.csv`. Must: 13, should: 7, could: 4, skip: 5.

## Out of scope (cannot or should not be cloned)

- Name, cat mascot, illustrations, copy, store assets: owned by KBTG.
- Automatic gallery scanning in the background: a web app cannot read the photo gallery on its own; the user picks images or shares them to the PWA.
- Verifying slips against bank APIs: needs agreements with banks.
- Subscription tiers (Silver / Gold), payments, accounts: out of the agreed scope.
- Their OCR models and bank templates: we write our own.

## Size

Screens 9, flows 5, entities 4. Hard parts: Thai OCR accuracy on slip layouts from 16 banks, decoding the slip QR, dedupe and income/expense detection. Size: **M** (a few weeks for a polished version; a working core loop is a few days).
