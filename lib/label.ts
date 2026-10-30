export const LABEL_W = 320;
export const LABEL_H = 240;
export const DOTS_PER_MM = 8;

export type DateFormat = "dd.mm.yy" | "dd.mm.yyyy" | "dd/mm/yy";
export type LabelPaper = "transparent" | "gaps";
export type FontKey =
  | "barlow" | "sharetechsans" | "jetbrains" | "space" | "sharetech" | "plex"
  | "caveat" | "shadows" | "reenie" | "nanum" | "homemade"
  | "rokkitt" | "courier" | "special" | "zilla" | "arvo"
  | "grotesk" | "rajdhani" | "chakra" | "saira"
  | "montech" | "montechsemi" | "lastsignature" | "typewriterserial";

export type PresetId = "serum-box" | "crema-box" | "cleanser-box" | "bottle";

/**
 * "classic": hourglass icon + the template's fonts.
 * "handmade": handwritten date, hourglass icon in the left cell.
 */
export type LabelDesign = "classic" | "handmade";

/**
 * A physical label type.
 * - wMm × hMm: the DESIGN area (what is actually printed, centred on the paper)
 * - paperWMm × paperHMm: the PAPER (sticker) loaded in the printer = canvas size
 */
export interface LabelPreset {
  id: PresetId;
  name: string;
  wMm: number;        // design width
  hMm: number;        // design height
  paperWMm: number;   // paper width
  paperHMm: number;   // paper height
  paper: LabelPaper;
  design: LabelDesign;
}

export const PRESETS: LabelPreset[] = [
  // white sticker paper 4×3 cm
  { id: "serum-box", name: "Serum box", wMm: 30, hMm: 30, paperWMm: 40, paperHMm: 30, paper: "gaps", design: "handmade" },       // design 3×3 cm
  { id: "crema-box", name: "Cream box", wMm: 35, hMm: 30, paperWMm: 40, paperHMm: 30, paper: "gaps", design: "handmade" },       // design 3.5×3 cm
  { id: "cleanser-box", name: "Cleanser box", wMm: 35, hMm: 30, paperWMm: 40, paperHMm: 30, paper: "gaps", design: "handmade" }, // design 3.5×3 cm
  // transparent sticker paper 3×3 cm
  { id: "bottle", name: "Bottle", wMm: 30, hMm: 20, paperWMm: 30, paperHMm: 30, paper: "transparent", design: "handmade" },     // design 3×2 cm
];

/** Falls back to the first preset if the saved id is missing/unknown. */
export const getPreset = (id?: string): LabelPreset => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

/**
 * Printhead width of the NIIMBOT B1: 48 mm = 384 dots. The paper roll is centred on the head by the
 * roll guides, so the centre of the head = the centre of the sticker.
 *
 * Why this matters: if we send an image NARROWER than the head (e.g. 320 dots for a 40 mm sticker),
 * the printer does not centre it, so the whole print lands off-centre and anything pushed towards the
 * edge gets cut. So the printed image is always made the full head width, with the sticker area in the
 * middle (see composeForPrinter).
 */
export const HEAD_DOTS = 384;

/** Fine alignment per paper type, in mm. + x = move right, + y = move down (towards the end of the sticker). */
export type Calibration = Record<LabelPaper, { x: number; y: number }>;
export const DEFAULT_CALIBRATION: Calibration = { gaps: { x: 0, y: 0 }, transparent: { x: 0, y: 0 } };

export const FONTS: Record<FontKey, { label: string; family: string; weight: number }> = {
  barlow: { label: "Barlow Condensed", family: "Barlow Condensed", weight: 700 },
  sharetechsans: { label: "Share Tech", family: "Share Tech", weight: 400 },
  jetbrains: { label: "JetBrains Mono", family: "JetBrains Mono", weight: 800 },
  space: { label: "Space Mono", family: "Space Mono", weight: 700 },
  sharetech: { label: "Share Tech Mono", family: "Share Tech Mono", weight: 400 },
  plex: { label: "IBM Plex Mono", family: "IBM Plex Mono", weight: 700 },
  // handwriting (date)
  caveat: { label: "Caveat", family: "Caveat", weight: 500 },
  shadows: { label: "Shadows Into Light", family: "Shadows Into Light", weight: 400 },
  reenie: { label: "Reenie Beanie", family: "Reenie Beanie", weight: 400 },
  nanum: { label: "Nanum Pen Script", family: "Nanum Pen Script", weight: 400 },
  homemade: { label: "Homemade Apple", family: "Homemade Apple", weight: 400 },
  lastsignature: { label: "Last Signature", family: "Last Signature", weight: 400 },
  // slab / typewriter
  rokkitt: { label: "Rokkitt", family: "Rokkitt", weight: 500 },
  courier: { label: "Courier Prime", family: "Courier Prime", weight: 400 },
  special: { label: "Special Elite", family: "Special Elite", weight: 400 },
  zilla: { label: "Zilla Slab", family: "Zilla Slab", weight: 500 },
  arvo: { label: "Arvo", family: "Arvo", weight: 400 },
  typewriterserial: { label: "Typewriter Serial", family: "Typewriter Serial", weight: 400 },
  // bold captions (HECHO EL / EXP / LOTE)
  grotesk: { label: "Space Grotesk", family: "Space Grotesk", weight: 700 },
  rajdhani: { label: "Rajdhani", family: "Rajdhani", weight: 700 },
  chakra: { label: "Chakra Petch", family: "Chakra Petch", weight: 600 },
  saira: { label: "Saira Semi Condensed", family: "Saira Semi Condensed", weight: 700 },
  montechsemi: { label: "Montech SemiBold", family: "Montech", weight: 600 },
  // values (EXP date, lot)
  montech: { label: "Montech Regular", family: "Montech", weight: 400 },
};

/** Which font each part of the label uses, depending on the design. */
export function fontsFor(tpl: LabelTemplate) {
  if (getPreset(tpl.preset).design === "handmade") {
    return {
      date: tpl.dateFont ?? "lastsignature",
      value: tpl.valueFont ?? "montech",
      caption: tpl.captionFont ?? "montechsemi",
      body: tpl.bodyFont ?? "typewriterserial",
    };
  }
  return { date: tpl.font, value: tpl.font, caption: tpl.labelFont, body: tpl.labelFont };
}

/** Fixed parts of the label. Set once, saved in the browser. */
export interface LabelTemplate {
  preset: PresetId;       // which label type (design size + paper)
  madeLabel: string;      // "HECHO EL"
  expLabel: string;       // "EXP"
  lotLabel: string;       // "LOTE"
  dateFont: FontKey;      // handmade design: the big "made" date
  valueFont: FontKey;     // handmade design: EXP date + lot
  captionFont: FontKey;   // handmade design: HECHO EL / EXP / LOTE
  bodyFont: FontKey;      // handmade design: (unused now, left cell is the hourglass)
  lotPrefix: string;      // "TSA"
  lotWithYear: boolean;   // TSA + 26 + code
  format: DateFormat;
  font: FontKey;          // values (dates, lot)
  labelFont: FontKey;     // small captions (HECHO EL / EXP / LOTE)
  showIcon: boolean;
  density: number;        // 1–5
  paper: LabelPaper;      // kept for old saved data; the active paper comes from the preset
  offsetX: number;        // px, nudge print position
  offsetY: number;
  scale: number;          // % size of the table on the label (100 = reference design)
  lineWidth: number;      // table line thickness in dots (1 = reference, 2 = safer on thermal)
  calibration: Calibration; // printer alignment per paper type, mm (set with the alignment test print)
}

export const DEFAULT_TEMPLATE: LabelTemplate = {
  preset: "serum-box",
  madeLabel: "HECHO EL",
  expLabel: "EXP",
  lotLabel: "LOTE",
  dateFont: "lastsignature",
  valueFont: "montech",
  captionFont: "montechsemi",
  bodyFont: "typewriterserial",
  lotPrefix: "TSA",
  lotWithYear: true,
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
  calibration: DEFAULT_CALIBRATION,
};

export const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "dd.mm.yy", label: "22.08.26" },
  { value: "dd.mm.yyyy", label: "22.08.2026" },
  { value: "dd/mm/yy", label: "22/08/26" },
];

/** Fixed shelf life: expiry = made date + 11 months + 12 days. */
export const SHELF_LIFE = { months: 11, days: 12 } as const;

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

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Expiry date: made date + 11 months, then + 12 days. */
export function expiryDate(made: Date): Date {
  return addDays(addMonths(made, SHELF_LIFE.months), SHELF_LIFE.days);
}

// ---------------------------------------------------------------------------
// Lot code: no server or database needed.
//
// The code is made from the exact print time (milliseconds), then scrambled so it
// looks random. The scramble is reversible, so two different print times can never
// give the same code. 30 bits of milliseconds = ~12.4 days, so within any day (in any
// time zone, Central European time included) every print gets a different code, on
// every laptop. Only two prints in the very same millisecond could match.
// ---------------------------------------------------------------------------

// 32 characters, without 0/O and 1/I/L, so the printed code is easy to read
const LOT_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOT_MASK = 0x3fffffff; // 30 bits
const LOT_LENGTH = 6;        // 6 × 5 bits = 30 bits

/** Reversible 30-bit mixer: different inputs always give different outputs. */
function scramble30(n: number): number {
  let x = n & LOT_MASK; // keeps the low 30 bits (works on large millisecond values too)
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d) & LOT_MASK;
  x ^= x >>> 13;
  x = Math.imul(x, 0x297a2d39) & LOT_MASK;
  x ^= x >>> 16;
  return x;
}

/** 6 letters/numbers from the print time, e.g. "K7M2QX". */
export function lotCode(at: Date): string {
  const x = scramble30(at.getTime());
  let s = "";
  for (let i = 0; i < LOT_LENGTH; i++) s += LOT_ALPHABET[(x >>> (5 * i)) & 31];
  return s;
}

export function buildLot(tpl: LabelTemplate, now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  return `${tpl.lotPrefix}${tpl.lotWithYear ? yy : ""}${lotCode(now)}`.toUpperCase();
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
  x0: number, y0: number, x1: number, y1: number, maxPx: number, bold = false, stroke = 0,
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
  if (stroke > 0) {
    // thin pen strokes (handwriting) can vanish on a thermal head, so thicken them a little
    ctx.lineWidth = stroke;
    ctx.lineJoin = "round";
    ctx.strokeText(text, cx, cy);
  }
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

export interface DrawOptions {
  /** Preview only: faint dashed outline of the design area. Never set this when printing. */
  guide?: boolean;
}

/**
 * Draws the lot/date table (reference design):
 *   ┌───────────┬───────────────────────┐
 *   │ HECHO EL  │       22.08.26        │
 *   ├───────────┼────────┬──────────────┤
 *   │           │  EXP   │   22.07.27   │
 *   │ hourglass ├────────┼──────────────┤
 *   │           │ LOTE   │ TSA26K7M2QX  │
 *   └───────────┴────────┴──────────────┘
 *
 * The canvas is the PAPER size (from the preset). The design area (preset wMm × hMm)
 * is centred on the paper, and the layout is drawn proportionally inside that area.
 * Text sizes follow the smaller of the two scale factors of the design area.
 */
export function drawLabel(canvas: HTMLCanvasElement, tpl: LabelTemplate, now: Date, opts: DrawOptions = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const preset = getPreset(tpl.preset);

  // Whole paper (canvas)
  const PW = canvas.width, PH = canvas.height;
  // Design area, centred on the paper (whole dots)
  const W = Math.min(PW, Math.round(preset.wMm * DOTS_PER_MM));
  const H = Math.min(PH, Math.round(preset.hMm * DOTS_PER_MM));
  const ox = Math.round((PW - W) / 2);
  const oy = Math.round((PH - H) / 2);

  // Font size factor relative to the 40×30 reference label
  const fs = Math.min(W / LABEL_W, H / LABEL_H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PW, PH);

  // Move origin to the design area, then scale around the design centre.
  // The table spans 0.729 W × 0.473 H at 100 %, so cap the scale to keep it 1 mm inside the PAPER.
  const kFit = Math.min((PW / 2 - DOTS_PER_MM) / (0.366 * W), (PH / 2 - DOTS_PER_MM) / (0.239 * H));
  const k = Math.max(0.5, Math.min(1.4, kFit, tpl.scale / 100));
  ctx.translate(ox, oy);
  ctx.translate(W / 2 + tpl.offsetX, H / 2 + tpl.offsetY);
  ctx.scale(k, k);
  ctx.translate(-W / 2, -H / 2);

  // Reference proportions (fractions of the design area)
  const X0 = 0.134 * W, X1 = 0.337 * W, X2 = 0.484 * W, X3 = 0.863 * W;
  const Y0 = 0.261 * H, Y1 = 0.431 * H, Y2 = 0.566 * H, Y3 = 0.734 * H;

  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";

  // Table lines are drawn in device pixels (no transform) and snapped to whole dots,
  // so a 1-dot line prints as exactly one crisp row/column of dots.
  const lw = Math.max(1, Math.min(3, Math.round(tpl.lineWidth)));
  const sx = (x: number) => Math.round(ox + W / 2 + tpl.offsetX + (x - W / 2) * k);
  const sy = (y: number) => Math.round(oy + H / 2 + tpl.offsetY + (y - H / 2) * k);
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
  const exp = formatDate(expiryDate(now), tpl.format);
  const lot = buildLot(tpl, now);

  const handmade = preset.design === "handmade";
  const f = fontsFor(tpl);

  cellText(ctx, f.caption, tpl.madeLabel, X0, Y0, X1, Y1, 18 * fs, !handmade);
  if (handmade) cellText(ctx, f.date, made, X1, Y0, X3, Y1, 42 * fs, false, 0.7 * fs);
  else cellText(ctx, f.date, made, X1, Y0, X3, Y1, 30 * fs);
  cellText(ctx, f.caption, tpl.expLabel, X1, Y1, X2, Y2, 18 * fs, !handmade);
  cellText(ctx, f.value, exp, X2, Y1, X3, Y2, 22 * fs);
  cellText(ctx, f.caption, tpl.lotLabel, X1, Y2, X2, Y3, 18 * fs, !handmade);
  cellText(ctx, f.value, lot, X2, Y2, X3, Y3, 22 * fs);

  // Left cell: hourglass image
  if (handmade || tpl.showIcon) drawHourglass(ctx, (X0 + X1) / 2, (Y1 + Y3) / 2, (Y3 - Y1) * 0.78);

  // Thermal head prints only pure black or white
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const img = ctx.getImageData(0, 0, PW, PH);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    const b = v < 150 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = b;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Preview-only guide: drawn AFTER the black/white pass so it never reaches the printer
  if (opts.guide && (W < PW || H < PH)) {
    ctx.save();
    ctx.strokeStyle = "rgba(120, 120, 120, 0.7)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(ox + 0.5, oy + 0.5, W - 1, H - 1);
    ctx.restore();
  }
}
/**
 * Builds the image that is actually sent to the printer:
 * full printhead width (HEAD_DOTS) × paper height, with the paper-sized label canvas in the middle,
 * moved by the calibration (mm). Pixels are copied 1:1 (whole-dot offsets), so nothing is resampled.
 */
export function composeForPrinter(
  label: HTMLCanvasElement,
  calibration: { x: number; y: number } = { x: 0, y: 0 },
  headDots = HEAD_DOTS,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(headDots, label.width);
  out.height = label.height;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  const dx = Math.round((out.width - label.width) / 2 + calibration.x * DOTS_PER_MM);
  const dy = Math.round(calibration.y * DOTS_PER_MM);
  ctx.drawImage(label, dx, dy);
  return out;
}

/**
 * Alignment test (paper-sized): a frame 1 mm inside the sticker edge, a centre cross and mm ticks.
 * Print it once per paper type; if the frame is not even on all sides, adjust the calibration.
 */
export function drawAlignmentTest(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width, H = canvas.height, m = DOTS_PER_MM;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  // frame 1 mm inside the edge, 2 dots thick
  ctx.fillRect(m, m, W - 2 * m, 2);
  ctx.fillRect(m, H - m - 2, W - 2 * m, 2);
  ctx.fillRect(m, m, 2, H - 2 * m);
  ctx.fillRect(W - m - 2, m, 2, H - 2 * m);
  // centre cross
  const cx = Math.round(W / 2), cy = Math.round(H / 2);
  ctx.fillRect(cx - 3 * m, cy - 1, 6 * m, 2);
  ctx.fillRect(cx - 1, cy - 3 * m, 2, 6 * m);
  // mm ticks along the inside of the frame, longer every 5 mm
  for (let x = m; x <= W - m; x += m) {
    const long = Math.round((x - cx) / m) % 5 === 0;
    ctx.fillRect(x, m, 1, long ? 2 * m : m);
    ctx.fillRect(x, H - m - (long ? 2 * m : m), 1, long ? 2 * m : m);
  }
  for (let y = m; y <= H - m; y += m) {
    const long = Math.round((y - cy) / m) % 5 === 0;
    ctx.fillRect(m, y, long ? 2 * m : m, 1);
    ctx.fillRect(W - m - (long ? 2 * m : m), y, long ? 2 * m : m, 1);
  }
  ctx.font = `700 ${2 * m}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${W / m}×${H / m} mm`, cx, cy + 5 * m);
}
