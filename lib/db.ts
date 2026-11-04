// // Postgres (Supabase) connection and queries. Server only: imported by the route handlers in app/api.
// import { randomInt } from "node:crypto";
// import { Pool } from "pg";
// import { HttpError } from "@/lib/http";
// import { LOT_ALPHABET, LOT_LENGTH, buildLot, expiryDate, parseDay, toDay, type LabelTemplate } from "@/lib/label";

// /** The production day (and so the lot) changes at midnight in this time zone. */
// export const LOT_TIMEZONE = process.env.LOT_TIMEZONE || "Europe/Madrid";

// function createPool() {
//   const raw = process.env.DATABASE_URL;
//   if (!raw) throw new Error("DATABASE_URL is not set");
//   // Supabase's certificate chain isn't in Node's default CA list, and an sslmode in the URL would
//   // override the ssl option below, so drop it and keep the connection encrypted.
//   const url = new URL(raw);
//   url.searchParams.delete("sslmode");
//   const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
//   return new Pool({ connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
// }

// // One pool per server process (kept on globalThis so dev hot reloads don't open new ones)
// const g = globalThis as typeof globalThis & { __lotPool?: Pool };
// const pool = () => (g.__lotPool ??= createPool());

// async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
//   return (await pool().query(sql, params)).rows as T[];
// }

// const isUniqueViolation = (e: unknown) => (e as { code?: string }).code === "23505";

// /** Today in LOT_TIMEZONE, "YYYY-MM-DD". */
// export async function serverToday(): Promise<string> {
//   const [r] = await query<{ d: string }>(`SELECT to_char((now() AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS d`, [LOT_TIMEZONE]);
//   return r.d;
// }

// // ---------------------------------------------------------------------------
// // Products
// // ---------------------------------------------------------------------------

// export interface Product {
//   id: number;
//   name: string;
//   shelfMonths: number;
//   shelfDays: number;
//   active: boolean;
// }

// const PRODUCT_COLS = `id, name, shelf_months AS "shelfMonths", shelf_days AS "shelfDays",
//   active`;

// export const listProducts = () => query<Product>(`SELECT ${PRODUCT_COLS} FROM products ORDER BY sort, name`);

// async function getProduct(id: number): Promise<Product | undefined> {
//   return (await query<Product>(`SELECT ${PRODUCT_COLS} FROM products WHERE id = $1`, [id]))[0];
// }

// export type ProductInput = Omit<Product, "id">;

// export async function saveProduct(id: number | null, p: ProductInput): Promise<Product> {
//   try {
//     const rows = id === null
//       ? await query<Product>(
//         `INSERT INTO products (name, shelf_months, shelf_days, active, sort)
//          VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort), 0) + 1 FROM products))
//          RETURNING ${PRODUCT_COLS}`,
//         [p.name, p.shelfMonths, p.shelfDays, p.active],
//       )
//       : await query<Product>(
//         `UPDATE products SET name = $2, shelf_months = $3, shelf_days = $4, active = $5
//          WHERE id = $1 RETURNING ${PRODUCT_COLS}`,
//         [id, p.name, p.shelfMonths, p.shelfDays, p.active],
//       );
//     if (!rows[0]) throw new HttpError(404, "Product not found");
//     return rows[0];
//   } catch (e) {
//     if (isUniqueViolation(e)) throw new HttpError(409, `There is already a product called "${p.name}"`);
//     throw e;
//   }
// }

// // ---------------------------------------------------------------------------
// // Lots
// // ---------------------------------------------------------------------------

// export interface Lot {
//   id: number;
//   date: string; // YYYY-MM-DD
//   code: string; // random part, e.g. K7M2QX
//   productId: number | null;
// }

// const LOT_COLS = `id, to_char(lot_date, 'YYYY-MM-DD') AS date, code, product_id AS "productId"`;

// /** 6 random letters/numbers from the lot alphabet (no 0/O, 1/I/L). */
// function randomCode(): string {
//   let s = "";
//   for (let i = 0; i < LOT_LENGTH; i++) s += LOT_ALPHABET[randomInt(LOT_ALPHABET.length)];
//   return s;
// }

// /** The product's lot for that day, if it has been made (looking never makes one). */
// export async function findLot(productId: number, date: string): Promise<Lot | null> {
//   return (await query<Lot>(`SELECT ${LOT_COLS} FROM lots WHERE product_id = $1 AND lot_date = $2`, [productId, date]))[0] ?? null;
// }

// /**
//  * The product's lot for that day, made on first use. ON CONFLICT makes this safe when two devices
//  * print at the same moment: both get the same row. A clash of the random code with another lot is retried.
//  */
// async function getOrCreateLot(productId: number, date: string): Promise<Lot> {
//   for (let attempt = 0; attempt < 5; attempt++) {
//     try {
//       const [lot] = await query<Lot>(
//         `INSERT INTO lots (product_id, lot_date, code) VALUES ($1, $2, $3)
//          ON CONFLICT (product_id, lot_date) DO UPDATE SET lot_date = EXCLUDED.lot_date
//          RETURNING ${LOT_COLS}`,
//         [productId, date, randomCode()],
//       );
//       return lot;
//     } catch (e) {
//       if (isUniqueViolation(e)) continue; // random code already used by another lot
//       throw e;
//     }
//   }
//   throw new Error("Couldn't make a unique lot code");
// }

// // ---------------------------------------------------------------------------
// // Print jobs
// // ---------------------------------------------------------------------------

// export interface StartPrintInput {
//   productId: number;
//   preset: string;
//   quantity: number;
//   lotPrefix: LabelTemplate["lotPrefix"];
//   lotWithYear: LabelTemplate["lotWithYear"];
//   date: string | null; // null = today; an earlier day needs a note
//   note: string;
// }

// /** Records a print job as "pending" under the product's lot for that day, before anything is printed. */
// export async function startPrint(input: StartPrintInput) {
//   const today = await serverToday();
//   const date = input.date ?? today;
//   if (date > today) throw new HttpError(400, "Can't print a lot for a day that hasn't come yet");
//   if (date < today && !input.note) throw new HttpError(400, "Write why you're printing an earlier day's lot");
//   const product = await getProduct(input.productId);
//   if (!product?.active) throw new HttpError(400, "Pick a product");

//   const lot = await getOrCreateLot(product.id, date);
//   const made = parseDay(lot.date);
//   const exp = expiryDate(made, { months: product.shelfMonths, days: product.shelfDays });
//   const [row] = await query<{ id: number }>(
//     `INSERT INTO prints (lot_id, lot, preset, quantity, exp_date, note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
//     [lot.id, buildLot(input, made, lot.code), input.preset, input.quantity, toDay(exp), input.note || null],
//   );
//   return { id: row.id, lot, product };
// }

// export type PrintStatus = "pending" | "printed" | "failed";

// export async function finishPrint(id: number, status: "printed" | "failed") {
//   const rows = await query(`UPDATE prints SET status = $2 WHERE id = $1 AND status = 'pending' RETURNING id`, [id, status]);
//   if (!rows.length) throw new HttpError(404, "Print job not found or already finished");
//   return { ok: true };
// }

// export interface PrintJob {
//   id: number;
//   lotId: number;
//   lot: string;          // full code as printed
//   lotDate: string;      // YYYY-MM-DD, the made date on the label
//   expDate: string;
//   productId: number | null;
//   productName: string | null;
//   preset: string;
//   quantity: number;
//   status: PrintStatus;
//   note: string | null;
//   printedAt: string;    // ISO time the job was started
// }

// const PRINT_SELECT = `
//   SELECT p.id, l.id AS "lotId", p.lot, to_char(l.lot_date, 'YYYY-MM-DD') AS "lotDate",
//          to_char(p.exp_date, 'YYYY-MM-DD') AS "expDate", l.product_id AS "productId", pr.name AS "productName",
//          p.preset, p.quantity, p.status, p.note,
//          to_char(p.printed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "printedAt"
//   FROM prints p JOIN lots l ON l.id = p.lot_id LEFT JOIN products pr ON pr.id = l.product_id`;

// export interface ListPrintsInput {
//   from: string;
//   to: string;
//   /** "lot": by the lot's (made) day, like the reports. "printed": by the day the job was printed. */
//   by: "lot" | "printed";
//   productId: number | null;
// }

// export function listPrints({ from, to, by, productId }: ListPrintsInput) {
//   const dayExpr = by === "printed" ? `(p.printed_at AT TIME ZONE $4)::date` : `l.lot_date`;
//   return query<PrintJob>(
//     `${PRINT_SELECT}
//      WHERE ${dayExpr} BETWEEN $1 AND $2 AND ($3::int IS NULL OR l.product_id = $3)
//      ORDER BY p.printed_at DESC LIMIT 5000`,
//     [from, to, productId, ...(by === "printed" ? [LOT_TIMEZONE] : [])],
//   );
// }

// // ---------------------------------------------------------------------------
// // Lot search and traceability
// // ---------------------------------------------------------------------------

// export interface LotSummary extends Lot {
//   productName: string | null;
//   lot: string | null;     // full code as printed (null if never printed)
//   expDate: string | null;
//   printed: number;        // labels in finished jobs
//   jobs: number;
//   materials: number;      // raw material batches recorded
//   matched: string | null; // search hit in a material batch, e.g. "Hyaluronic acid · HA-2231"
// }

// function lotSummarySql(where: string) {
//   return `
//     SELECT l.id, to_char(l.lot_date, 'YYYY-MM-DD') AS date, l.code, l.product_id AS "productId",
//            pr.name AS "productName",
//            (SELECT x.lot FROM prints x WHERE x.lot_id = l.id ORDER BY x.id LIMIT 1) AS lot,
//            (SELECT to_char(MAX(x.exp_date), 'YYYY-MM-DD') FROM prints x WHERE x.lot_id = l.id) AS "expDate",
//            COALESCE(SUM(p.quantity) FILTER (WHERE p.status = 'printed'), 0)::int AS printed,
//            (COUNT(p.id) FILTER (WHERE p.status = 'printed'))::int AS jobs,
//            (SELECT COUNT(*) FROM lot_materials m WHERE m.lot_id = l.id)::int AS materials,
//            (SELECT string_agg(m.material || ' · ' || m.batch, ', ') FROM lot_materials m
//              WHERE m.lot_id = l.id AND $1::text <> '' AND m.batch ILIKE $1) AS matched
//     FROM lots l LEFT JOIN products pr ON pr.id = l.product_id LEFT JOIN prints p ON p.lot_id = l.id
//     WHERE ${where}
//     GROUP BY l.id, pr.name`;
// }

// export interface LotSearch {
//   q: string;
//   from: string | null; // lot (made) day range, inclusive; null = open
//   to: string | null;
// }

// /** Labels printed, in total and per product, for every lot the search matches (not only the 50 listed). */
// export interface LotTotals {
//   lots: number;    // lots with at least one finished print
//   printed: number;
//   products: { name: string; lots: number; printed: number }[];
// }

// const LOT_SEARCH_LIMIT = 50;

// // $1 = text (ILIKE pattern or ''), $2/$3 = day range
// const LOT_FILTER = `($1 = '' OR l.code ILIKE $1
//     OR EXISTS (SELECT 1 FROM prints x WHERE x.lot_id = l.id AND x.lot ILIKE $1)
//     OR EXISTS (SELECT 1 FROM lot_materials m WHERE m.lot_id = l.id AND m.batch ILIKE $1))
//   AND ($2::date IS NULL OR l.lot_date >= $2) AND ($3::date IS NULL OR l.lot_date <= $3)`;

// /**
//  * Lots made in the day range whose code, printed lot or a material batch contains `q`
//  * (the latest 50), with totals over every matching lot.
//  */
// export async function searchLots({ q, from, to }: LotSearch) {
//   const params = [q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : "", from, to];
//   const [lots, byProduct] = await Promise.all([
//     query<LotSummary>(`${lotSummarySql(LOT_FILTER)} ORDER BY l.lot_date DESC, l.id DESC LIMIT ${LOT_SEARCH_LIMIT}`, params),
//     query<{ name: string; lots: number; printed: number }>(
//       `SELECT COALESCE(pr.name, 'No product') AS name, COUNT(DISTINCT l.id)::int AS lots,
//               SUM(p.quantity)::int AS printed
//        FROM lots l JOIN prints p ON p.lot_id = l.id AND p.status = 'printed' LEFT JOIN products pr ON pr.id = l.product_id
//        WHERE ${LOT_FILTER}
//        GROUP BY 1 ORDER BY 1`,
//       params,
//     ),
//   ]);
//   const totals: LotTotals = {
//     lots: byProduct.reduce((s, r) => s + r.lots, 0),
//     printed: byProduct.reduce((s, r) => s + r.printed, 0),
//     products: byProduct,
//   };
//   return { lots, totals, more: lots.length === LOT_SEARCH_LIMIT };
// }

// export interface Material {
//   id: number;
//   material: string;
//   supplier: string | null;
//   batch: string;
// }

// const MATERIAL_COLS = `id, material, supplier, batch`;

// export async function getLotDetail(id: number) {
//   const [lot] = await query<LotSummary>(lotSummarySql(`l.id = $2`), ["", id]);
//   if (!lot) throw new HttpError(404, "Lot not found");
//   const [prints, materials, product] = await Promise.all([
//     query<PrintJob>(`${PRINT_SELECT} WHERE l.id = $1 ORDER BY p.printed_at DESC`, [id]),
//     query<Material>(`SELECT ${MATERIAL_COLS} FROM lot_materials WHERE lot_id = $1 ORDER BY id`, [id]),
//     lot.productId === null ? undefined : getProduct(lot.productId),
//   ]);
//   return { lot, product: product ?? null, prints, materials };
// }

// export async function addMaterial(lotId: number, m: Omit<Material, "id">) {
//   try {
//     const [row] = await query<Material>(
//       `INSERT INTO lot_materials (lot_id, material, supplier, batch) VALUES ($1, $2, $3, $4) RETURNING ${MATERIAL_COLS}`,
//       [lotId, m.material, m.supplier, m.batch],
//     );
//     return row;
//   } catch (e) {
//     if ((e as { code?: string }).code === "23503") throw new HttpError(404, "Lot not found");
//     throw e;
//   }
// }

// export async function deleteMaterial(lotId: number, id: number) {
//   const rows = await query(`DELETE FROM lot_materials WHERE id = $1 AND lot_id = $2 RETURNING id`, [id, lotId]);
//   if (!rows.length) throw new HttpError(404, "Material not found");
//   return { ok: true };
// }

// // ---------------------------------------------------------------------------
// // Reports
// // ---------------------------------------------------------------------------

// export type StatsGroup = "day" | "month";

// export interface StatsRow {
//   period: string;                   // YYYY-MM-DD (first day of the month in month view)
//   printed: number;                  // labels printed
//   jobs: number;                     // print jobs
//   lots: string[];                   // lot codes as printed
//   products: Record<string, number>; // labels per product
// }

// /** Finished prints between two lot days (inclusive), grouped per day or per month, newest first. */
// export function getStats(from: string, to: string, group: StatsGroup, productId: number | null) {
//   return query<StatsRow>(
//     `WITH p AS (
//        SELECT date_trunc($3, l.lot_date)::date AS period, COALESCE(pr.name, 'No product') AS product,
//               p.lot, p.quantity
//        FROM prints p JOIN lots l ON l.id = p.lot_id LEFT JOIN products pr ON pr.id = l.product_id
//        WHERE p.status = 'printed' AND l.lot_date BETWEEN $1 AND $2 AND ($4::int IS NULL OR l.product_id = $4)
//      ), by_product AS (
//        SELECT period, product, SUM(quantity)::int AS n FROM p GROUP BY 1, 2
//      )
//      SELECT to_char(p.period, 'YYYY-MM-DD') AS period,
//             SUM(p.quantity)::int AS printed,
//             COUNT(*)::int AS jobs,
//             array_agg(DISTINCT p.lot ORDER BY p.lot) AS lots,
//             (SELECT jsonb_object_agg(b.product, b.n) FROM by_product b WHERE b.period = p.period) AS products
//      FROM p GROUP BY p.period ORDER BY p.period DESC`,
//     [from, to, group, productId],
//   );
// }

// // ---------------------------------------------------------------------------
// // Settings (label template, print choices), shared by every device
// // ---------------------------------------------------------------------------

// export const SETTING_KEYS = ["template", "print"] as const;
// export type SettingKey = (typeof SETTING_KEYS)[number];

// export async function getSetting(key: SettingKey): Promise<object | null> {
//   return (await query<{ value: object }>(`SELECT value FROM settings WHERE key = $1`, [key]))[0]?.value ?? null;
// }

// export async function saveSetting(key: SettingKey, value: object) {
//   await query(
//     `INSERT INTO settings (key, value) VALUES ($1, $2)
//      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
//     [key, JSON.stringify(value)],
//   );
//   return { ok: true };
// }



// Postgres (Supabase) connection and queries. Server only: imported by the route handlers in app/api.
import { randomInt } from "node:crypto";
import { Pool } from "pg";
import { HttpError } from "@/lib/http";
import { LOT_ALPHABET, LOT_LENGTH, PRESETS, buildLot, expiryDate, lotKindOf, parseDay, toDay, type LabelPreset, type LabelTemplate, type LotKind } from "@/lib/label";

/** The production day (and so the lot) changes at midnight in this time zone. */
export const LOT_TIMEZONE = process.env.LOT_TIMEZONE || "Europe/Madrid";

function createPool() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  // Supabase's certificate chain isn't in Node's default CA list, and an sslmode in the URL would
  // override the ssl option below, so drop it and keep the connection encrypted.
  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  return new Pool({ connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
}

// One pool per server process (kept on globalThis so dev hot reloads don't open new ones)
const g = globalThis as typeof globalThis & { __lotPool?: Pool };
const pool = () => (g.__lotPool ??= createPool());

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await pool().query(sql, params)).rows as T[];
}

const isUniqueViolation = (e: unknown) => (e as { code?: string }).code === "23505";

/** Today in LOT_TIMEZONE, "YYYY-MM-DD". */
export async function serverToday(): Promise<string> {
  const [r] = await query<{ d: string }>(`SELECT to_char((now() AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS d`, [LOT_TIMEZONE]);
  return r.d;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface Product {
  id: number;
  name: string;
  shelfMonths: number;
  shelfDays: number;
  active: boolean;
  surface: string;
}

export type ProductInput = Omit<Product, "id">;
const PRODUCT_COLS = `id, name, shelf_months AS "shelfMonths", shelf_days AS "shelfDays",
  active, surface`;

export const listProducts = () => query<Product>(`SELECT ${PRODUCT_COLS} FROM products ORDER BY sort, name`);

export async function saveProduct(id: number | null, p: ProductInput) {
  try {
    const rows = id === null
      ? await query<Product>(`INSERT INTO products (name, shelf_months, shelf_days, active, surface, sort)
         VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(sort),0)+1 FROM products)) RETURNING ${PRODUCT_COLS}`,
        [p.name, p.shelfMonths, p.shelfDays, p.active, p.surface])
      : await query<Product>(`UPDATE products SET name=$2, shelf_months=$3, shelf_days=$4, active=$5, surface=$6
         WHERE id=$1 RETURNING ${PRODUCT_COLS}`,
        [id, p.name, p.shelfMonths, p.shelfDays, p.active, p.surface]);
    if (!rows[0]) throw new HttpError(404, "Product not found");
    return rows[0];
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new HttpError(409, `A product with the name "${p.name}" already exists. Edit it or restore it from the archive.`);
    }
    throw e;
  }
}

export async function deleteArchivedProduct(id: number) {
  try {
    const rows = await query<{ id: number }>(
      `DELETE FROM products p
       WHERE p.id=$1 AND p.active=false
         AND NOT EXISTS (SELECT 1 FROM prints pr WHERE pr.product_id=p.id)
       RETURNING p.id`,
      [id],
    );
    if (rows[0]) return { ok: true as const };

    const [product] = await query<{ active: boolean; hasHistory: boolean }>(
      `SELECT p.active, EXISTS (SELECT 1 FROM prints pr WHERE pr.product_id=p.id) AS "hasHistory"
       FROM products p WHERE p.id=$1`,
      [id],
    );
    if (!product) throw new HttpError(404, "Product not found");
    if (product.active) throw new HttpError(409, "Archive this product before deleting it.");
    if (product.hasHistory) throw new HttpError(409, "This product has print history and cannot be deleted. Keep it archived to preserve traceability.");
    throw new HttpError(409, "This product could not be deleted.");
  } catch (e) {
    if ((e as { code?: string }).code === "23503") {
      throw new HttpError(409, "This product has print history and cannot be deleted. Keep it archived to preserve traceability.");
    }
    throw e;
  }
}

export async function saveProductWithLabel(id: number | null, p: ProductInput, label: LabelPreset) {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const productResult = id === null
      ? await client.query<Product>(
        `INSERT INTO products (name, shelf_months, shelf_days, active, surface, sort)
         VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(sort),0)+1 FROM products)) RETURNING ${PRODUCT_COLS}`,
        [p.name, p.shelfMonths, p.shelfDays, p.active, p.surface],
      )
      : await client.query<Product>(
        `UPDATE products SET name=$2, shelf_months=$3, shelf_days=$4, active=$5, surface=$6
         WHERE id=$1 RETURNING ${PRODUCT_COLS}`,
        [id, p.name, p.shelfMonths, p.shelfDays, p.active, p.surface],
      );
    if (!productResult.rows[0]) throw new HttpError(404, "Product not found");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('settings:presets'))`);
    const saved = await client.query<{ value: { items?: unknown } }>(
      `SELECT value FROM settings WHERE key = 'presets' FOR UPDATE`,
    );
    const storedItems = saved.rows[0]?.value?.items;
    const items = Array.isArray(storedItems) && storedItems.length ? storedItems as LabelPreset[] : PRESETS;
    const labelName = label.name.trim().toLocaleLowerCase();
    const existing = items.find((item) => item.id === label.id)
      ?? items.find((item) => item.name.trim().toLocaleLowerCase() === labelName)
      ?? items.filter((item) => item.name.trim().toLocaleLowerCase().startsWith(`${labelName} `))
        .sort((a, b) => b.name.length - a.name.length)[0];
    const savedLabel = { ...label, id: existing?.id ?? label.id };
    const nextItems = [
      ...items.filter((item) => item.id !== savedLabel.id && item.name.trim().toLocaleLowerCase() !== labelName),
      savedLabel,
    ];
    await client.query(
      `INSERT INTO settings (key, value) VALUES ('presets', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify({ items: nextItems })],
    );
    await client.query("COMMIT");
    return productResult.rows[0];
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (isUniqueViolation(e)) {
      throw new HttpError(409, `A product with the name "${p.name}" already exists. Edit it or restore it from the archive.`);
    }
    throw e;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Lots
// ---------------------------------------------------------------------------

export interface Lot {
  id: number;
  date: string; // YYYY-MM-DD
  code: string; // random part, e.g. K7M2QX
  kind: LotKind | null; // "box" or "bottle" (null on lots made before kinds existed)
}

const LOT_COLS = `id, to_char(lot_date, 'YYYY-MM-DD') AS date, code, kind`;

/** 6 random letters/numbers from the lot alphabet (no 0/O, 1/I/L). */
function randomCode(): string {
  let s = "";
  for (let i = 0; i < LOT_LENGTH; i++) s += LOT_ALPHABET[randomInt(LOT_ALPHABET.length)];
  return s;
}

/** The shared lot for the production day, if it has been made (looking never makes one). */
export async function findLot(date: string, kind: LotKind): Promise<Lot | null> {
  return (await query<Lot>(`SELECT ${LOT_COLS} FROM lots WHERE lot_date = $1 AND kind = $2`, [date, kind]))[0] ?? null;
}

/**
 * The shared day's lot, made on first use. ON CONFLICT makes this safe when two devices
 * print at the same moment: both get the same row. A clash of the random code with another lot is retried.
 */
async function getOrCreateLot(date: string, kind: LotKind): Promise<Lot> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [lot] = await query<Lot>(
        `INSERT INTO lots (lot_date, kind, code) VALUES ($1, $2, $3)
         ON CONFLICT (lot_date, kind) WHERE kind IS NOT NULL DO UPDATE SET lot_date = EXCLUDED.lot_date
         RETURNING ${LOT_COLS}`,
        [date, kind, randomCode()],
      );
      return lot;
    } catch (e) {
      if (isUniqueViolation(e)) continue; // random code already used by another lot
      throw e;
    }
  }
  throw new Error("Couldn't make a unique lot code");
}

// ---------------------------------------------------------------------------
// Print jobs
// ---------------------------------------------------------------------------

export interface StartPrintInput {
  productId: number;
  preset: string;
  quantity: number;
  lotPrefix: LabelTemplate["lotPrefix"];
  lotWithYear: LabelTemplate["lotWithYear"];
  date: string | null; // null = today; an earlier day needs a note
  note: string;
}

/** Records a print job as "pending" under the shared daily lot, before anything is printed. */
export async function startPrint(input: StartPrintInput) {
  const today = await serverToday();
  const date = input.date ?? today;
  if (date > today) throw new HttpError(400, "Can't print a lot for a day that hasn't come yet");
  if (date < today && !input.note) throw new HttpError(400, "Write why you're printing an earlier day's lot");

  const product = (await query<Product>(`SELECT ${PRODUCT_COLS} FROM products WHERE id=$1 AND active=true`, [input.productId]))[0];
  if (!product) throw new HttpError(400, "Pick an active product");
  const lot = await getOrCreateLot(date, lotKindOf(input.preset));
  const made = parseDay(lot.date);
  const exp = expiryDate(made, { months: product.shelfMonths, days: product.shelfDays });
  const [row] = await query<{ id: number }>(
    `INSERT INTO prints (lot_id, product_id, lot, preset, quantity, exp_date, note) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [lot.id, product.id, buildLot(input, made, lot.code), input.preset, input.quantity, toDay(exp), input.note || null],
  );
  return { id: row.id, lot, product };
}

export type PrintStatus = "pending" | "printed" | "failed";

export async function finishPrint(id: number, status: "printed" | "failed") {
  const rows = await query(`UPDATE prints SET status = $2 WHERE id = $1 AND status = 'pending' RETURNING id`, [id, status]);
  if (!rows.length) throw new HttpError(404, "Print job not found or already finished");
  return { ok: true };
}

export interface PrintJob {
  id: number;
  lotId: number;
  lot: string;          // full code as printed
  lotDate: string;      // YYYY-MM-DD, the made date on the label
  expDate: string;
  productId: number | null;
  productName: string | null;
  preset: string;
  quantity: number;
  status: PrintStatus;
  note: string | null;
  printedAt: string;    // ISO time the job was started
}

const PRINT_SELECT = `
  SELECT p.id, l.id AS "lotId", p.lot, to_char(l.lot_date, 'YYYY-MM-DD') AS "lotDate",
         to_char(p.exp_date, 'YYYY-MM-DD') AS "expDate", p.product_id AS "productId", pr.name AS "productName",
         p.preset, p.quantity, p.status, p.note,
         to_char(p.printed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "printedAt"
  FROM prints p JOIN lots l ON l.id = p.lot_id LEFT JOIN products pr ON pr.id = p.product_id`;

export interface ListPrintsInput {
  from: string;
  to: string;
  /** "lot": by the lot's (made) day, like the reports. "printed": by the day the job was printed. */
  by: "lot" | "printed";
}

export function listPrints({ from, to, by }: ListPrintsInput) {
  const dayExpr = by === "printed" ? `(p.printed_at AT TIME ZONE $3)::date` : `l.lot_date`;
  return query<PrintJob>(
    `${PRINT_SELECT}
     WHERE ${dayExpr} BETWEEN $1 AND $2
     ORDER BY p.printed_at DESC LIMIT 5000`,
    [from, to, ...(by === "printed" ? [LOT_TIMEZONE] : [])],
  );
}

// ---------------------------------------------------------------------------
// Lot search and traceability
// ---------------------------------------------------------------------------

export interface LotSummary extends Lot {
  lot: string | null;     // full code as printed (null if never printed)
  expDate: string | null;
  printed: number;        // labels in finished jobs
  byType: Record<string, number> | null; // labels in finished jobs per label type (preset id)
  jobs: number;
  materials: number;      // raw material batches recorded
  matched: string | null; // search hit in a material batch, e.g. "Hyaluronic acid · HA-2231"
}

function lotSummarySql(where: string) {
  return `
    SELECT l.id, to_char(l.lot_date, 'YYYY-MM-DD') AS date, l.code, l.kind,
           (SELECT x.lot FROM prints x WHERE x.lot_id = l.id ORDER BY x.id LIMIT 1) AS lot,
           (SELECT to_char(MAX(x.exp_date), 'YYYY-MM-DD') FROM prints x WHERE x.lot_id = l.id) AS "expDate",
           COALESCE(SUM(p.quantity) FILTER (WHERE p.status = 'printed'), 0)::int AS printed,
           (COUNT(p.id) FILTER (WHERE p.status = 'printed'))::int AS jobs,
           (SELECT jsonb_object_agg(t.preset, t.n)
              FROM (SELECT x.preset, SUM(x.quantity)::int AS n FROM prints x
                    WHERE x.lot_id = l.id AND x.status = 'printed' GROUP BY x.preset) t) AS "byType",
           (SELECT COUNT(*) FROM lot_materials m WHERE m.lot_id = l.id)::int AS materials,
           (SELECT string_agg(m.material || ' · ' || m.batch, ', ') FROM lot_materials m
             WHERE m.lot_id = l.id AND $1::text <> '' AND m.batch ILIKE $1) AS matched
    FROM lots l LEFT JOIN prints p ON p.lot_id = l.id
    WHERE ${where}
    GROUP BY l.id`;
}

export interface LotSearch {
  q: string;
  from: string | null; // lot (made) day range, inclusive; null = open
  to: string | null;
}

/** Labels printed, in total and per label type, for every lot the search matches (not only the 50 listed). */
export interface LotTotals {
  lots: number;    // lots with at least one finished print
  printed: number;
  types: Record<string, number>; // labels per label type (preset id)
}

const LOT_SEARCH_LIMIT = 50;

// $1 = text (ILIKE pattern or ''), $2/$3 = day range
const LOT_FILTER = `($1 = '' OR l.code ILIKE $1
    OR EXISTS (SELECT 1 FROM prints x WHERE x.lot_id = l.id AND x.lot ILIKE $1)
    OR EXISTS (SELECT 1 FROM lot_materials m WHERE m.lot_id = l.id AND m.batch ILIKE $1))
  AND ($2::date IS NULL OR l.lot_date >= $2) AND ($3::date IS NULL OR l.lot_date <= $3)`;

/**
 * Lots made in the day range whose code, printed lot or a material batch contains `q`
 * (the latest 50), with totals over every matching lot.
 */
export async function searchLots({ q, from, to }: LotSearch) {
  const params = [q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : "", from, to];
  const [lots, byType, [count]] = await Promise.all([
    query<LotSummary>(`${lotSummarySql(LOT_FILTER)} ORDER BY l.lot_date DESC, l.id DESC LIMIT ${LOT_SEARCH_LIMIT}`, params),
    query<{ preset: string; printed: number }>(
      `SELECT p.preset, SUM(p.quantity)::int AS printed
       FROM lots l JOIN prints p ON p.lot_id = l.id AND p.status = 'printed'
       WHERE ${LOT_FILTER}
       GROUP BY p.preset`,
      params,
    ),
    query<{ lots: number }>(
      `SELECT COUNT(DISTINCT l.id)::int AS lots
       FROM lots l JOIN prints p ON p.lot_id = l.id AND p.status = 'printed'
       WHERE ${LOT_FILTER}`,
      params,
    ),
  ]);
  const types: Record<string, number> = {};
  for (const r of byType) types[r.preset] = r.printed;
  const totals: LotTotals = {
    lots: count?.lots ?? 0,
    printed: byType.reduce((sum, r) => sum + r.printed, 0),
    types,
  };
  return { lots, totals, more: lots.length === LOT_SEARCH_LIMIT };
}

export interface Material {
  id: number;
  material: string;
  supplier: string | null;
  batch: string;
}

const MATERIAL_COLS = `id, material, supplier, batch`;

export async function getLotDetail(id: number) {
  const [lot] = await query<LotSummary>(lotSummarySql(`l.id = $2`), ["", id]);
  if (!lot) throw new HttpError(404, "Lot not found");
  const [prints, materials] = await Promise.all([
    query<PrintJob>(`${PRINT_SELECT} WHERE l.id = $1 ORDER BY p.printed_at DESC`, [id]),
    query<Material>(`SELECT ${MATERIAL_COLS} FROM lot_materials WHERE lot_id = $1 ORDER BY id`, [id]),
  ]);
  return { lot, prints, materials };
}

export async function addMaterial(lotId: number, m: Omit<Material, "id">) {
  try {
    const [row] = await query<Material>(
      `INSERT INTO lot_materials (lot_id, material, supplier, batch) VALUES ($1, $2, $3, $4) RETURNING ${MATERIAL_COLS}`,
      [lotId, m.material, m.supplier, m.batch],
    );
    return row;
  } catch (e) {
    if ((e as { code?: string }).code === "23503") throw new HttpError(404, "Lot not found");
    throw e;
  }
}

export async function deleteMaterial(lotId: number, id: number) {
  const rows = await query(`DELETE FROM lot_materials WHERE id = $1 AND lot_id = $2 RETURNING id`, [id, lotId]);
  if (!rows.length) throw new HttpError(404, "Material not found");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type StatsGroup = "day" | "month";

export interface StatsRow {
  period: string;                   // YYYY-MM-DD (first day of the month in month view)
  printed: number;                  // labels printed
  jobs: number;                     // print jobs
  lots: string[];                   // lot codes as printed
  types: Record<string, number>;    // labels per label type (preset id)
}

/** Finished prints between two lot days (inclusive), grouped per day or per month, newest first. */
export function getStats(from: string, to: string, group: StatsGroup) {
  return query<StatsRow>(
    `WITH p AS (
       SELECT date_trunc($3, l.lot_date)::date AS period, p.lot, p.quantity, p.preset
       FROM prints p JOIN lots l ON l.id = p.lot_id
       WHERE p.status = 'printed' AND l.lot_date BETWEEN $1 AND $2
     ), by_type AS (
       SELECT period, preset, SUM(quantity)::int AS n FROM p GROUP BY 1, 2
     )
     SELECT to_char(p.period, 'YYYY-MM-DD') AS period,
            SUM(p.quantity)::int AS printed,
            COUNT(*)::int AS jobs,
            array_agg(DISTINCT p.lot ORDER BY p.lot) AS lots,
            (SELECT jsonb_object_agg(t.preset, t.n) FROM by_type t WHERE t.period = p.period) AS types
     FROM p GROUP BY p.period ORDER BY p.period DESC`,
    [from, to, group],
  );
}

// ---------------------------------------------------------------------------
// Settings (label template, print choices), shared by every device
// ---------------------------------------------------------------------------

export const SETTING_KEYS = ["template", "print", "presets"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export async function getSetting(key: SettingKey): Promise<object | null> {
  return (await query<{ value: object }>(`SELECT value FROM settings WHERE key = $1`, [key]))[0]?.value ?? null;
}

export async function saveSetting(key: SettingKey, value: object) {
  await query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
  return { ok: true };
}

export async function getPresets(): Promise<LabelPreset[]> {
  const saved = await getSetting("presets");
  const items = (saved as { items?: unknown } | null)?.items;
  return Array.isArray(items) && items.length ? items as LabelPreset[] : PRESETS;
}
