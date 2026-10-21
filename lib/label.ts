// Label geometry for NIIMBOT B1: 203 dpi ≈ 8 dots/mm.
// A 40×30 mm sticker → 320 × 240 dots (4:3).
export const LABEL_W = 320;
export const LABEL_H = 240;

export type DateFormat = "dd.mm.yy" | "dd.mm.yyyy" | "dd/mm/yy";
export type LabelPaper = "transparent" | "gaps";
export type FontKey = "barlow" | "sharetechsans" | "jetbrains" | "space" | "sharetech" | "plex";

export const FONTS: Record<FontKey, { label: string; family: string; weight: number }> = {
  barlow: { label: "Barlow Condensed", family: "Barlow Condensed", weight: 700 },
  sharetechsans: { label: "Share Tech", family: "Share Tech", weight: 400 },
  jetbrains: { label: "JetBrains Mono", family: "JetBrains Mono", weight: 800 },
  space: { label: "Space Mono", family: "Space Mono", weight: 700 },
  sharetech: { label: "Share Tech Mono", family: "Share Tech Mono", weight: 400 },
  plex: { label: "IBM Plex Mono", family: "IBM Plex Mono", weight: 700 },
};

/** Fixed parts of the label. Set once, saved in the browser. */
export interface LabelTemplate {
  madeLabel: string;      // "HECHO EL:"
  expLabel: string;       // "EXP:"
  lotLabel: string;       // "LOTE:"
  lotPrefix: string;      // "TSA"
  lotWithYear: boolean;   // TSA + 26 + batch
  shelfLifeMonths: number;
  format: DateFormat;
  font: FontKey;          // values (dates, lot)
  labelFont: FontKey;     // small captions (HECHO EL / EXP / LOTE)
  showIcon: boolean;
  density: number;        // 1–5
  paper: LabelPaper;
  offsetX: number;        // px, nudge print position
  offsetY: number;
  scale: number;          // % size of the table on the label (100 = reference design)
  lineWidth: number;      // table line thickness in dots (1 = reference, 2 = safer on thermal)
}

export const DEFAULT_TEMPLATE: LabelTemplate = {
  madeLabel: "HECHO EL:",
  expLabel: "EXP:",
  lotLabel: "LOTE:",
  lotPrefix: "TSA",
  lotWithYear: true,
  shelfLifeMonths: 12,
  format: "dd.mm.yy",
  font: "plex",
  labelFont: "barlow",
  showIcon: true,
  density: 3,
  paper: "gaps",
  offsetX: 0,
  offsetY: 0,
  scale: 125,
  lineWidth: 1,
};

/** Values that change per batch / per print. */
export interface PrintData {
  batch: string; // "057"
}

export const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "dd.mm.yy", label: "22.08.26" },
  { value: "dd.mm.yyyy", label: "22.08.2026" },
  { value: "dd/mm/yy", label: "22/08/26" },
];

const p2 = (n: number) => String(n).padStart(2, "0");

export function formatDate(d: Date, f: DateFormat): string {
  const dd = p2(d.getDate()), mm = p2(d.getMonth() + 1);
  const yyyy = String(d.getFullYear()), yy = yyyy.slice(-2);
  if (f === "dd.mm.yyyy") return `${dd}.${mm}.${yyyy}`;
  if (f === "dd/mm/yy") return `${dd}/${mm}/${yy}`;
  return `${dd}.${mm}.${yy}`;
}

/** Adds months, clamping to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), last));
  return r;
}

export function buildLot(tpl: LabelTemplate, data: PrintData, now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  return `${tpl.lotPrefix}${tpl.lotWithYear ? yy : ""}${data.batch}`.toUpperCase();
}

/** Makes sure the chosen web font is downloaded before drawing on canvas. */
export async function ensureFont(key: FontKey) {
  const f = FONTS[key];
  try {
    await document.fonts.load(`${f.weight} 40px "${f.family}"`, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:/");
  } catch { /* fall back to system mono */ }
}

function setFont(ctx: CanvasRenderingContext2D, key: FontKey, px: number) {
  const f = FONTS[key];
  ctx.font = `${f.weight} ${px}px "${f.family}", ui-monospace, Menlo, Consolas, monospace`;
}

/** Writes `text` centred in a cell, shrinking it to fit. `bold` adds a thin stroke (fake bold). */
function cellText(
  ctx: CanvasRenderingContext2D, key: FontKey, text: string,
  x0: number, y0: number, x1: number, y1: number, maxPx: number, bold = false,
) {
  const pad = 6;
  // Small caps labels are letter-spaced like the reference design
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = bold ? "1px" : "0px";
  let px = maxPx;
  setFont(ctx, key, px);
  while (px > 8 && ctx.measureText(text).width > x1 - x0 - pad * 2) setFont(ctx, key, --px);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + px * 0.04;
  ctx.fillText(text, cx, cy);
}

/** Hourglass as in the reference: square bulbs, crossed glass, sand in the top bulb. */
function drawHourglass(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number) {
  const w = h * 0.62, hw = w / 2;
  const top = cy - h / 2, bot = cy + h / 2;
  const bulb = h * 0.22, r = h * 0.05;
  ctx.lineWidth = Math.max(1.5, h / 30);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // outline: top bulb → crossing diagonals → bottom bulb
  ctx.beginPath();
  ctx.moveTo(cx - hw, top + bulb);
  ctx.lineTo(cx - hw, top + r);
  ctx.quadraticCurveTo(cx - hw, top, cx - hw + r, top);
  ctx.lineTo(cx + hw - r, top);
  ctx.quadraticCurveTo(cx + hw, top, cx + hw, top + r);
  ctx.lineTo(cx + hw, top + bulb);
  ctx.lineTo(cx - hw, bot - bulb);
  ctx.lineTo(cx - hw, bot - r);
  ctx.quadraticCurveTo(cx - hw, bot, cx - hw + r, bot);
  ctx.lineTo(cx + hw - r, bot);
  ctx.quadraticCurveTo(cx + hw, bot, cx + hw, bot - r);
  ctx.lineTo(cx + hw, bot - bulb);
  ctx.lineTo(cx - hw, top + bulb);
  ctx.stroke();
  // thicker base
  ctx.fillRect(cx - hw + r, bot - ctx.lineWidth * 0.5, w - r * 2, ctx.lineWidth * 1.4);
  // sand: shield shape in the top bulb
  const s = h * 0.07, sw = hw - s;
  ctx.beginPath();
  ctx.moveTo(cx - sw, top + s);
  ctx.lineTo(cx + sw, top + s);
  ctx.lineTo(cx + sw, top + bulb - s * 0.3);
  ctx.lineTo(cx + sw * 0.35, top + bulb + s * 1.3);
  ctx.lineTo(cx - sw * 0.35, top + bulb + s * 1.3);
  ctx.lineTo(cx - sw, top + bulb - s * 0.3);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws the lot/date table (reference design, 4:3):
 *   ┌───────────┬───────────────────────┐
 *   │ HECHO EL: │       22.08.26        │
 *   ├───────────┼────────┬──────────────┤
 *   │           │  EXP:  │   22.08.27   │
 *   │ hourglass ├────────┼──────────────┤
 *   │           │ LOTE:  │   TSA26057   │
 *   └───────────┴────────┴──────────────┘
 */
export function drawLabel(canvas: HTMLCanvasElement, tpl: LabelTemplate, data: PrintData, now: Date) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const W = LABEL_W, H = LABEL_H;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  // Reference proportions (fractions of the label), scaled around the label centre
  const k = Math.max(0.5, Math.min(1.4, tpl.scale / 100));
  ctx.translate(W / 2 + tpl.offsetX, H / 2 + tpl.offsetY);
  ctx.scale(k, k);
  ctx.translate(-W / 2, -H / 2);

  const X0 = 0.134 * W, X1 = 0.337 * W, X2 = 0.484 * W, X3 = 0.863 * W;
  const Y0 = 0.261 * H, Y1 = 0.431 * H, Y2 = 0.566 * H, Y3 = 0.734 * H;

  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";

  // Table lines are drawn in device pixels (no transform) and snapped to whole dots,
  // so a 1-dot line prints as exactly one crisp row/column of dots.
  const lw = Math.max(1, Math.min(3, Math.round(tpl.lineWidth)));
  const sx = (x: number) => Math.round(W / 2 + tpl.offsetX + (x - W / 2) * k);
  const sy = (y: number) => Math.round(H / 2 + tpl.offsetY + (y - H / 2) * k);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const hLine = (x0: number, x1: number, y: number) => ctx.fillRect(sx(x0), sy(y), sx(x1) - sx(x0) + lw, lw);
  const vLine = (x: number, y0: number, y1: number) => ctx.fillRect(sx(x), sy(y0), lw, sy(y1) - sy(y0) + lw);
  hLine(X0, X3, Y0);   // outer top
  hLine(X0, X3, Y3);   // outer bottom
  vLine(X0, Y0, Y3);   // outer left
  vLine(X3, Y0, Y3);   // outer right
  hLine(X0, X3, Y1);   // under the "made" row
  hLine(X1, X3, Y2);   // between EXP and LOTE
  vLine(X1, Y0, Y3);   // label column
  vLine(X2, Y1, Y3);   // EXP/LOTE label column
  ctx.restore();

  const made = formatDate(now, tpl.format);
  const exp = formatDate(addMonths(now, tpl.shelfLifeMonths), tpl.format);
  const lot = buildLot(tpl, data, now);

  cellText(ctx, tpl.labelFont, tpl.madeLabel, X0, Y0, X1, Y1, 18, true);
  cellText(ctx, tpl.font, made, X1, Y0, X3, Y1, 30);
  cellText(ctx, tpl.labelFont, tpl.expLabel, X1, Y1, X2, Y2, 18, true);
  cellText(ctx, tpl.font, exp, X2, Y1, X3, Y2, 22);
  cellText(ctx, tpl.labelFont, tpl.lotLabel, X1, Y2, X2, Y3, 18, true);
  cellText(ctx, tpl.font, lot, X2, Y2, X3, Y3, 22);

  if (tpl.showIcon) drawHourglass(ctx, (X0 + X1) / 2, (Y1 + Y3) / 2, (Y3 - Y1) * 0.78);

  // Thermal head prints only pure black or white
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    const b = v < 150 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = b;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
