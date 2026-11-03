// Browser-side calls to the route handlers in app/api.
import type {
  Lot, LotSummary, Material, PrintJob, Product, ProductInput, StatsGroup, StatsRow,
} from "@/lib/db";
import type { LabelTemplate } from "@/lib/label";

export type { Lot, LotSummary, Material, PrintJob, Product, ProductInput, StatsGroup, StatsRow };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Server error ${res.status}`);
  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Products
export const fetchProducts = () => call<Product[]>("/api/products");
export const saveProduct = (id: number | null, p: ProductInput) =>
  id === null ? call<Product>("/api/products", json("POST", p)) : call<Product>(`/api/products/${id}`, json("PUT", p));

// Lots
/** The product's lot for that day (null until its first print). `today` is the server's day. */
export const fetchDayLot = (productId: number, date?: string) =>
  call<{ today: string; lot: Lot | null }>(`/api/lots/day?${new URLSearchParams({ product: String(productId), ...(date ? { date } : {}) })}`);
export const searchLots = (q: string) => call<LotSummary[]>(`/api/lots?${new URLSearchParams({ q })}`);
export const fetchLot = (id: number) =>
  call<{ lot: LotSummary; product: Product | null; prints: PrintJob[]; materials: Material[] }>(`/api/lots/${id}`);
export const addMaterial = (lotId: number, m: Omit<Material, "id">) =>
  call<Material>(`/api/lots/${lotId}/materials`, json("POST", m));
export const deleteMaterial = (lotId: number, id: number) =>
  call<{ ok: true }>(`/api/lots/${lotId}/materials/${id}`, { method: "DELETE" });

// Print jobs
export interface StartPrint {
  productId: number;
  quantity: number;
  date: string | null; // null = today
  note: string;
}

/** Records a pending print job and returns its id with the lot to print. */
export const startPrint = (tpl: LabelTemplate, job: StartPrint) =>
  call<{ id: number; lot: Lot; product: Product }>("/api/prints", json("POST", {
    ...job, preset: tpl.preset, lotPrefix: tpl.lotPrefix, lotWithYear: tpl.lotWithYear,
  }));
export const finishPrint = (id: number, status: "printed" | "failed") =>
  call<{ ok: true }>(`/api/prints/${id}`, json("PATCH", { status }));
export const setWasted = (id: number, wasted: number) =>
  call<{ ok: true }>(`/api/prints/${id}`, json("PATCH", { wasted }));
export const fetchPrints = (from: string, to: string, by: "lot" | "printed", productId?: number | null) =>
  call<PrintJob[]>(`/api/prints?${new URLSearchParams({ from, to, by, ...(productId ? { product: String(productId) } : {}) })}`);

// Reports
export const fetchStats = (from: string, to: string, group: StatsGroup, productId?: number | null) =>
  call<{ rows: StatsRow[] }>(`/api/stats?${new URLSearchParams({ from, to, group, ...(productId ? { product: String(productId) } : {}) })}`);
