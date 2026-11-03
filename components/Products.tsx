"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/Nav";
import { errorText, fetchProducts, saveProduct, type Product } from "@/lib/api";
import { PAPER_NAMES, PRESETS, presetForProduct } from "@/lib/label";

/** Form values are strings while typing; the server checks the numbers. */
type Draft = { name: string; shelfMonths: string; shelfDays: string; dailyTarget: string; active: boolean };

const toDraft = (p?: Product): Draft => ({
  name: p?.name ?? "",
  shelfMonths: String(p?.shelfMonths ?? 11),
  shelfDays: String(p?.shelfDays ?? 12),
  dailyTarget: p?.dailyTarget ? String(p.dailyTarget) : "",
  active: p?.active ?? true,
});

const fromDraft = (d: Draft) => ({
  name: d.name,
  shelfMonths: Number(d.shelfMonths),
  shelfDays: Number(d.shelfDays),
  dailyTarget: d.dailyTarget.trim() === "" ? null : Number(d.dailyTarget),
  active: d.active,
});

const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

const inputCls = "h-10 w-full min-w-0 rounded-lg border border-line bg-white px-2.5 text-sm outline-none focus:border-accent";

function ProductRow({ product, onSaved }: { product?: Product; onSaved: () => void }) {
  const [draft, setDraft] = useState(() => toDraft(product));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = !sameDraft(draft, toDraft(product));
  const set = (k: keyof Draft, v: string | boolean) => { setDraft({ ...draft, [k]: v }); setSaved(false); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveProduct(product?.id ?? null, fromDraft(draft));
      setErr(null);
      setSaved(true);
      if (!product) setDraft(toDraft());
      onSaved();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className={`grid grid-cols-2 items-end gap-2 border-t border-line px-3 py-3 sm:grid-cols-[1.4fr_0.7fr_0.7fr_0.9fr_auto_auto] ${
      product && !product.active ? "opacity-60" : ""}`}>
      <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-muted sm:col-span-1">
        {product ? "Name" : "New product"}
        <input required value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Body oil" className={`${inputCls} font-normal text-ink`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Shelf months
        <input type="number" min={0} max={120} required value={draft.shelfMonths} onChange={(e) => set("shelfMonths", e.target.value)} className={`${inputCls} font-normal text-ink tabular-nums`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        + days
        <input type="number" min={0} max={366} required value={draft.shelfDays} onChange={(e) => set("shelfDays", e.target.value)} className={`${inputCls} font-normal text-ink tabular-nums`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Daily target
        <input type="number" min={1} value={draft.dailyTarget} placeholder="none" onChange={(e) => set("dailyTarget", e.target.value)} className={`${inputCls} font-normal text-ink tabular-nums`} />
      </label>
      <label className="flex h-10 items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
        In use
      </label>
      <button type="submit" disabled={busy || (!!product && !dirty)}
        className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40">
        {product ? (saved && !dirty ? "Saved" : "Save") : "Add"}
      </button>
      {product && <LabelSize name={draft.name} />}
      {err && <p className="col-span-full text-sm text-err">{err}</p>}
    </form>
  );
}

const size = (w: number, h: number) => `${w} × ${h} mm`;

/** The product's own label type (by name) with its print and paper size; Bottle fits every product. */
function LabelSize({ name }: { name: string }) {
  const p = presetForProduct(name);
  const bottle = PRESETS.find((x) => x.id === "bottle");
  return (
    <p className="col-span-full flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {p ? (
        <span>
          <span className="font-semibold text-ink">{p.name}</span> · label {size(p.wMm, p.hMm)} on {size(p.paperWMm, p.paperHMm)} {PAPER_NAMES[p.paper].toLowerCase()}
        </span>
      ) : <span>No box label named after this product · use any label type</span>}
      {bottle && p?.id !== bottle.id && (
        <span>
          <span className="font-semibold text-ink">{bottle.name}</span> · label {size(bottle.wMm, bottle.hMm)} on {size(bottle.paperWMm, bottle.paperHMm)} {PAPER_NAMES[bottle.paper].toLowerCase()}
        </span>
      )}
    </p>
  );
}

/** Every label type: the printed area and the sticker paper it goes on. */
function LabelTypes() {
  return (
    <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Label types and paper</h2>
      <p className="mt-1 text-xs text-muted">Label = the printed table. Paper = the sticker loaded in the printer; the label is printed in its middle.</p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-page text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Label type</th>
              <th className="px-3 py-2.5 font-semibold">Label size</th>
              <th className="px-3 py-2.5 font-semibold">Paper size</th>
              <th className="px-3 py-2.5 font-semibold">Paper</th>
            </tr>
          </thead>
          <tbody>
            {PRESETS.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-3 py-2.5 font-semibold">{p.name}</td>
                <td className="px-3 py-2.5 tabular-nums">{size(p.wMm, p.hMm)}</td>
                <td className="px-3 py-2.5 tabular-nums">{size(p.paperWMm, p.paperHMm)}</td>
                <td className="px-3 py-2.5">{PAPER_NAMES[p.paper]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Products: name, shelf life (sets the expiry date) and an optional daily target. */
export function Products() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => fetchProducts().then((p) => { setProducts(p); setErr(null); }, (e) => setErr(errorText(e)));
  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
      <PageHeader title="Products" subtitle="shelf life and targets" />
      <section className="border-y border-line bg-white sm:rounded-2xl sm:border">
        <p className="px-4 pt-4 pb-3 text-xs text-muted sm:px-5">
          Each product gets its own lot every day. Expiry = made date + shelf months + days.
          A product that is not in use is hidden on the print page; its old lots stay.
        </p>
        {err && <p className="px-4 pb-3 text-sm text-err sm:px-5">{err}</p>}
        {products?.map((p) => <ProductRow key={`${p.id}-${JSON.stringify(p)}`} product={p} onSaved={load} />)}
        {products && <ProductRow onSaved={load} />}
      </section>
      <div className="mt-3 sm:mt-4"><LabelTypes /></div>
    </div>
  );
}
