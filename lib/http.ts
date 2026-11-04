// // Small helpers for the route handlers in app/api. Server only.
// import type { ProductInput } from "@/lib/db";

// /** An error with a message that is safe to show in the app (bad input, not found, ...). */
// export class HttpError extends Error {
//   constructor(public status: number, message: string) {
//     super(message);
//   }
// }

// /** Runs a handler and turns its result, or its error, into a JSON response. */
// export async function handle(name: string, fn: () => Promise<unknown>): Promise<Response> {
//   try {
//     return Response.json(await fn());
//   } catch (e) {
//     if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
//     console.error(name, e);
//     return Response.json({ error: "Database error (see the server log)" }, { status: 503 });
//   }
// }

// export const readJson = (request: Request): Promise<Record<string, unknown>> =>
//   request.json().then((b) => (b && typeof b === "object" ? b : {}), () => ({}));

// const DAY = /^\d{4}-\d{2}-\d{2}$/;

// /** "YYYY-MM-DD" or throws 400. */
// export function day(v: unknown, what = "date"): string {
//   if (typeof v !== "string" || !DAY.test(v) || Number.isNaN(Date.parse(v))) throw new HttpError(400, `Bad ${what}`);
//   return v;
// }

// /** Whole number in [min, max] or throws 400. */
// export function int(v: unknown, what: string, min: number, max: number): number {
//   const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
//   if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
//     throw new HttpError(400, `${what} must be a whole number from ${min} to ${max}`);
//   }
//   return n;
// }

// /** Trimmed text, cut to `max` characters ("" when missing). */
// export const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// /** Body → product fields, or throws 400. */
// export function parseProduct(b: Record<string, unknown>): ProductInput {
//   const name = text(b.name, 60);
//   if (!name) throw new HttpError(400, "Give the product a name");
//   return {
//     name,
//     shelfMonths: int(b.shelfMonths, "Shelf life months", 0, 120),
//     shelfDays: int(b.shelfDays, "Shelf life days", 0, 366),
//     active: b.active !== false,
//   };
// }



// Small helpers for the route handlers in app/api. Server only.
import type { ProductInput } from "@/lib/db";
import type { LabelPreset } from "@/lib/label";
/** An error with a message that is safe to show in the app (bad input, not found, ...). */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Runs a handler and turns its result, or its error, into a JSON response. */
export async function handle(name: string, fn: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await fn());
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error(name, e);
    return Response.json({ error: "Database error (see the server log)" }, { status: 503 });
  }
}

export const readJson = (request: Request): Promise<Record<string, unknown>> =>
  request.json().then((b) => (b && typeof b === "object" ? b : {}), () => ({}));

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" or throws 400. */
export function day(v: unknown, what = "date"): string {
  if (typeof v !== "string" || !DAY.test(v) || Number.isNaN(Date.parse(v))) throw new HttpError(400, `Bad ${what}`);
  return v;
}

/** Whole number in [min, max] or throws 400. */
export function int(v: unknown, what: string, min: number, max: number): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${what} must be a whole number from ${min} to ${max}`);
  }
  return n;
}

/** Trimmed text, cut to `max` characters ("" when missing). */
export const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseProduct(b: Record<string, unknown>): ProductInput {
  const name = text(b.name, 60);
  if (!name) throw new HttpError(400, "Give the product a name");
  return {
    name,
    shelfMonths: int(b.shelfMonths, "Shelf life months", 0, 120),
    shelfDays: int(b.shelfDays, "Shelf life days", 0, 366),
    active: b.active !== false,
    surface: text(b.surface, 100),
  };
}

export function parseProductLabel(b: Record<string, unknown>, productName: string): LabelPreset {
  const id = text(b.id, 80);
  if (!id) throw new HttpError(400, "Product label id is required");
  if (b.paper !== "gaps" && b.paper !== "transparent") throw new HttpError(400, "Choose a valid paper type");
  if (b.design !== "handmade" && b.design !== "classic") throw new HttpError(400, "Choose a valid design style");
  return {
    id,
    name: productName,
    wMm: int(b.wMm, "Design width", 1, 1000),
    hMm: int(b.hMm, "Design height", 1, 1000),
    paperWMm: int(b.paperWMm, "Paper width", 1, 1000),
    paperHMm: int(b.paperHMm, "Paper height", 1, 1000),
    paper: b.paper,
    design: b.design,
  };
}
