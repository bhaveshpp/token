# ટોકન / टोकन — Shop token system (Google Sheet + Apps Script + GitHub Pages)

Interface in **Gujarati and Hindi** (ગુ / हि button in the header; menu items have a Gujarati and a Hindi name). Separate from the accounts app (own Sheet + URL).

```
backend/Code.gs → Apps Script     site/ → index (login) · counter · kitchen · order (customer) · report · admin · common.js · common.css
tests/          → node tests
```

## Setup
1. New Google Sheet → Extensions → Apps Script → paste `backend/Code.gs` → run **`setupSheets`** (tabs Users, Menu, Customers, Tokens, Settings + example menu + default settings).
2. Edit `createUser` (admin / cashier / karigar / viewer) → run it once per user.
3. Deploy as Web app (Execute as *Me*, Access *Anyone*) → URL into `API_URL` in `site/common.js` → upload `site/` to GitHub Pages.
4. Admin → **સેટિંગ્સ**: shop name, shop WhatsApp number (customers' pending orders go there), customer-page link (for the PIN message), pending expiry minutes (15), max pending per customer (2), refresh seconds (6), WhatsApp message texts.

## Who does what
| Role | Pages | Can |
|---|---|---|
| **Admin** | counter · kitchen · report · admin | everything: menu / prices / out-of-stock, cancel tokens, settings, archive |
| **Cashier** | counter · kitchen | register customers, make **paid** tokens (cash / UPI), **confirm** / reject customers' pending orders, WhatsApp, reset a customer's PIN |
| **Karigar** | kitchen | sees only CONFIRMED tokens: token no, customer name + mobile, items, **PARCEL (red) / DINE-IN (green)**; marks તૈયાર / આપી દીધું. **No money, no pending orders** |
| **Viewer** | counter (read-only) · report | sees everything, changes nothing |
| **Customer** | order | logs in with **mobile + 4-digit PIN**; sees the menu and **only his own** tokens; places orders; cancels his own pending order |

## Flow
- **Cashier token**: customer = guest (no mobile) or search by name / mobile or add new (mobile + name → a **PIN** is created and shown once; the WhatsApp message carries it) → items, PARCEL / DINE-IN (must choose), cash / UPI (+ ref) → token **T-001** (numbers restart every day) → WhatsApp button if there is a mobile.
- **Customer order**: logs in → picks items + PARCEL / DINE-IN → status **PENDING** with a code **P-01** (no token number, karigar cannot see it) → "WhatsApp to the shop" button → pays at the counter → cashier presses **Confirm** (+ cash / UPI) → real number **T-0xx** appears on his phone and in the kitchen. Unconfirmed orders **expire** after the setting (15 min); a customer can have at most 2 pending.
- **Guests cannot self-order.** Prices are always taken from the menu on the server (a token keeps the price it was made with).
- Screens refresh every few seconds (polling, only while the tab is visible). **No offline mode**: no internet = no tokens (use the paper token book).

## Reports / archive
- **રિપોર્ટ**: today / month / custom — sales, cash vs UPI, orders, parcel vs dine-in, items sold, top customers, day-wise graph (cancelled / rejected / expired counted separately).
- **આર્કાઇવ** (Admin, manual): pick a month → preview → **Archive**. Finished tokens (closed / rejected / expired / cancelled) are copied to the tab `Tokens_YYYY_MM`, **verified**, and only then removed from `Tokens`. Open tokens stay. Customers / Menu / Users / Settings are never touched. Reports include archived months.

## Limits (be aware)
- Google Sheets is not a real-time database: fine for ~100–200 tokens/day; Apps Script has daily quotas — test a busy hour first.
- A customer's PIN proves he owns the WhatsApp number (it is sent there); there is no OTP.
- WhatsApp opens as a `wa.me` link — the cashier presses Send (no automatic sending, no cost).
- The PWA hub (single launcher page) is NOT part of this package.

## Tests
`node tests/token_gs_test.js` (91 — roles, PIN, pending / confirm / expiry, polling, reports, archive, security) · `node tests/token_dom_test.js` (59, needs `npm i jsdom` — Gujarati + Hindi screens, every role).
They prove the logic on fake sheets, not real Google Sheets / WhatsApp / phones.
