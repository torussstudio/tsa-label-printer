# Lot Label Printer (NIIMBOT B1)

Next.js + Tailwind web app that prints The Spanish Alchemist lot/date label on a NIIMBOT B1 over Web Bluetooth.
Label: **40×30 mm sticker** (320×240 dots at 203 dpi, 4:3).

```
┌───────────┬───────────────────────┐
│ HECHO EL: │       22.08.26        │  ← today (system clock, taken at print time)
├───────────┼────────┬──────────────┤
│           │  EXP:  │   22.08.27   │  ← today + shelf life (months)
│ hourglass ├────────┼──────────────┤
│           │ LOTE:  │ TSA26K7M2QX  │  ← prefix + YY + the day's random code (one lot per day)
└───────────┴────────┴──────────────┘
```

## Database (Supabase)

Lots and print counts are stored in Postgres (Supabase).

1. Supabase → SQL editor → run [`db/schema.sql`](db/schema.sql). Run it again after updating the app:
   it is safe to re-run and upgrades an older database.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` (Supabase → Connect → Transaction pooler).
   Set the same variables in your host (e.g. Vercel → Settings → Environment Variables).

- **One lot per product per day:** the first print of a product on a day (Spain time, `LOT_TIMEZONE`) makes a
  random 6-character code; every print of that product that day, on any device, reuses it.
  The label's "made" date is the lot's day.
- **Products** (`/products`): name and shelf life (expiry = made + months + days),
  with each product's label and paper size, and a table of every label type.
- **Counting:** each Print press is saved as a job (`pending` → `printed` / `failed`). Only `printed` jobs count.
- **Settings** (label template, printer alignment, selected product, quick jobs) are saved in the `settings` table and
  shared by every device; nothing is kept in the browser. Settings a browser saved before are copied up once.
- **Print page:** today's jobs from every device and quick jobs
  (product + label type + quantity).
- **Lots** (`/lots`): search by lot code or by a raw material's supplier batch, and filter by a day or a date range
  (with the total labels and lots for that range, per product); each lot page lists its print jobs
  and the material batches used in it.
- **Reports** (`/reports`): this week / this month / last month / this year, by product, with a chart
  and a CSV download of every print job in the period.
- Printing needs the database: if it can't be reached, the print is stopped with an error.

## Run

```bash
npm install
npm run dev        # http://localhost:3000  (localhost counts as secure, Bluetooth works)
npm run build && npm start
```

Deploy anywhere that serves **HTTPS** (Vercel, Netlify, your own server). Web Bluetooth needs a secure context and a Chromium browser (Chrome/Edge on Android, Windows, macOS, Linux). iPhone/Safari is not supported.

## Use

1. **Connect printer** → pick `B1-xxxx` in the browser popup.
2. Template (once): labels, date format, lot prefix, font, label paper, darkness, table size. **Alignment** button: print a test frame and nudge it. Saved in the database for every device.
3. Each batch: pick the **product**, set **quantity**, **Print**.

## Structure

```
app/                 layout (fonts + globals.css), print page
  lots/, lots/[id]/  lot search, lot detail (prints + raw materials)
  products/          products (shelf life)
  reports/           day/month totals page
  api/               products, lots, lots/day, lots/[id]/materials, prints, stats (route handlers)
components/
  LabelPrinter.tsx   connection, product, day, quick jobs, quantity, print flow
  TodayPrints.tsx    today's print jobs
  LabelPreview.tsx   canvas preview + renderForPrint()
  TemplateForm.tsx   template editor
  LotSearch.tsx, LotDetail.tsx, Products.tsx, Reports.tsx, Nav.tsx
db/schema.sql        Postgres tables (products, lots, prints, lot_materials)
hooks/useTemplate.ts settings saved in the database (template, alignment, print choices) + live clock
lib/label.ts         geometry (320×240 @ 203 dpi), dates, expiry, lot, drawLabel()
lib/db.ts            Postgres pool + queries (server only)
lib/http.ts          route handler helpers: errors, input checks
lib/api.ts           browser calls to /api
lib/printer.ts       NiimBlueLib wrapper (lazy-imported, client only)
```

Label layout lives in `drawLabel()` in `lib/label.ts`.

## Notes

- Fonts are bundled via @fontsource (no Google Fonts request), so the canvas draws the same everywhere.
- Printer protocol: [`@mmote/niimbluelib`](https://github.com/MultiMote/niimbluelib), pinned to an exact version (alpha library, API changes between releases).
- Thermal printing is 1-bit; black on a transparent label reads as the dark grey seen on the bottle.
- Expiry clamps to month end (e.g. 29.02 + 12 months → 28.02).
