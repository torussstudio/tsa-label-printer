# Lot Label Printer (NIIMBOT B1)

Next.js + Tailwind web app that prints The Spanish Alchemist lot/date label on a NIIMBOT B1 over Web Bluetooth.
Label: **40×30 mm sticker** (320×240 dots at 203 dpi, 4:3).

```
┌───────────┬───────────────────────┐
│ HECHO EL: │       22.08.26        │  ← today (system clock, taken at print time)
├───────────┼────────┬──────────────┤
│           │  EXP:  │   22.08.27   │  ← today + shelf life (months)
│ hourglass ├────────┼──────────────┤
│           │ LOTE:  │   TSA26057   │  ← prefix + YY + batch (placeholder, numbering not final)
└───────────┴────────┴──────────────┘
```

## Run

```bash
npm install
npm run dev        # http://localhost:3000  (localhost counts as secure, Bluetooth works)
npm run build && npm start
```

Deploy anywhere that serves **HTTPS** (Vercel, Netlify, your own server). Web Bluetooth needs a secure context and a Chromium browser (Chrome/Edge on Android, Windows, macOS, Linux). iPhone/Safari is not supported.

## Use

1. **Connect printer** → pick `B1-xxxx` in the browser popup.
2. Template (once): labels, date format, shelf life, lot prefix, font, label paper, darkness, position nudge, table size. Saved in localStorage.
3. Each batch: set **Batch number**, set **quantity**, **Print**.

## Structure

```
app/                 layout (fonts + globals.css), page
components/
  LabelPrinter.tsx   connection, batch, quantity, print flow
  LabelPreview.tsx   canvas preview + renderForPrint()
  TemplateForm.tsx   template editor
hooks/useTemplate.ts localStorage state + live clock
lib/label.ts         geometry (320×240 @ 203 dpi), dates, expiry, lot, drawLabel()
lib/printer.ts       NiimBlueLib wrapper (lazy-imported, client only)
```

Label layout lives in `drawLabel()` in `lib/label.ts`.

## Notes

- Fonts are bundled via @fontsource (no Google Fonts request), so the canvas draws the same everywhere.
- Printer protocol: [`@mmote/niimbluelib`](https://github.com/MultiMote/niimbluelib), pinned to an exact version (alpha library, API changes between releases).
- Thermal printing is 1-bit; black on a transparent label reads as the dark grey seen on the bottle.
- Expiry clamps to month end (e.g. 29.02 + 12 months → 28.02).
