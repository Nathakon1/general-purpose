# Design system: Jodjai

Our own look: warm paper background, a deep teal primary, rounded cards, emoji as category icons (no borrowed art).
Tokens live in `app/src/styles/tokens.css` (light + dark). Type: system UI stack with Thai fallbacks (Noto Sans Thai, Sarabun, Loma).

| role | light | dark |
| --- | --- | --- |
| bg | #F7F4EE | #15181A |
| surface | #FFFFFF | #1F2326 |
| text | #1E2326 | #ECEFF0 |
| muted | #5E676D | #9AA4AA |
| primary | #0F6E6A | #4FC3B8 |
| expense | #B4372F | #FF8A80 |
| income | #1F7A3A | #7BD88F |
| warn | #8A5A00 | #FFC857 |

Spacing 4/8/12/16/24/32. Radius 10 (inputs), 16 (cards), 999 (chips). Components: Button (primary, secondary, ghost, danger), Card, TxRow, CategoryChip, AmountField, MonthSwitcher, Donut, DayBars, BottomNav, Dialog, Toast.
