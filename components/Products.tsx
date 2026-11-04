"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/Nav";
import { showToast } from "@/components/Toast";
import { deleteProduct, fetchPresets, fetchProducts, saveProduct, saveProductWithLabel, type Product, type ProductInput } from "@/lib/api";
import { type LabelPaper, type LabelPreset } from "@/lib/label";

const productDefaults: ProductInput = { name: "", shelfMonths: 11, shelfDays: 12, active: true, surface: "" };
const blankLabel = (id: string, name: string): LabelPreset => ({
  id, name, wMm: Number.NaN, hMm: Number.NaN, paperWMm: Number.NaN, paperHMm: Number.NaN, paper: "gaps", design: "handmade",
});
const field = "h-10 w-full rounded-lg border border-line bg-white px-3 outline-none focus:border-accent disabled:opacity-60";

function Spinner() {
  return <span aria-hidden="true" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

const savingContent = (saving: boolean, label: string) => saving
  ? <span className="inline-flex items-center gap-2"><Spinner />Saving…</span>
  : label;

const surfaceOption = (surface: string) => {
  const normalized = surface.trim().toLocaleLowerCase();
  return normalized === "box" ? "Box" : normalized === "bottle" ? "Bottle" : "";
};

function findProductLabel(name: string, labels: LabelPreset[]) {
  const productName = name.trim().toLocaleLowerCase();
  return labels.find((label) => label.name.trim().toLocaleLowerCase() === productName)
    ?? labels.filter((label) => label.name.trim().toLocaleLowerCase().startsWith(`${productName} `))
      .sort((a, b) => b.name.length - a.name.length)[0];
}

function labelInput(label: LabelPreset): Omit<LabelPreset, "name"> {
  return { id: label.id, wMm: label.wMm, hMm: label.hMm, paperWMm: label.paperWMm, paperHMm: label.paperHMm, paper: label.paper, design: "handmade" };
}

const validDimensions = (label: LabelPreset) =>
  [label.wMm, label.hMm, label.paperWMm, label.paperHMm].every((value) => Number.isInteger(value) && value > 0);

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ProductInput>>({});
  const [labelDrafts, setLabelDrafts] = useState<Record<number, LabelPreset>>({});
  const [newProduct, setNewProduct] = useState(productDefaults);
  const [newLabel, setNewLabel] = useState(blankLabel("", ""));
  const [showArchived, setShowArchived] = useState(false);
  const [busyActions, setBusyActions] = useState<Set<string>>(() => new Set());
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (deleteCandidate && !dialog.open) dialog.showModal();
    if (!deleteCandidate && dialog.open) dialog.close();
  }, [deleteCandidate]);

  const runSave = async (action: string, save: () => Promise<void>) => {
    setBusyActions((current) => new Set(current).add(action));
    try { await save(); }
    catch (e) { showToast("error", e instanceof Error ? e.message : String(e)); }
    finally {
      setBusyActions((current) => {
        const next = new Set(current);
        next.delete(action);
        return next;
      });
    }
  };

  useEffect(() => {
    Promise.all([fetchProducts(), fetchPresets()]).then(([rows, labels]) => {
      setProducts(rows);
      setDrafts(Object.fromEntries(rows.map((p) => [p.id, {
        name: p.name, shelfMonths: p.shelfMonths, shelfDays: p.shelfDays, active: p.active, surface: p.surface,
      }])));
      setLabelDrafts(Object.fromEntries(rows.map((p) => {
        const matched = findProductLabel(p.name, labels);
        return [p.id, matched ? { ...matched, name: p.name, design: "handmade" } : blankLabel(`product-${p.id}`, p.name)];
      })));
    }).catch((e: unknown) => showToast("error", e instanceof Error ? e.message : String(e)));
  }, []);

  const setProductField = <K extends keyof ProductInput>(id: number, key: K, value: ProductInput[K]) =>
    setDrafts((all) => ({ ...all, [id]: { ...all[id], [key]: value } }));

  const setLabelField = <K extends keyof LabelPreset>(id: number, key: K, value: LabelPreset[K]) =>
    setLabelDrafts((all) => ({ ...all, [id]: { ...all[id], [key]: value } }));

  const persistProduct = async (product: Product, input: ProductInput) => {
    await runSave(`save-product-${product.id}`, async () => {
      const draftLabel = labelDrafts[product.id] ?? blankLabel(`product-${product.id}`, input.name);
      if (!input.name.trim()) throw new Error("Enter a product name.");
      if (!validDimensions(draftLabel)) throw new Error("Enter all four label dimensions as positive whole numbers before saving.");
      const saved = await saveProductWithLabel(product.id, { ...input, name: input.name.trim() }, labelInput(draftLabel));
      setProducts((all) => all.map((p) => p.id === product.id ? saved : p));
      setDrafts((all) => ({ ...all, [product.id]: { ...input, name: input.name.trim() } }));
      const savedLabel = { ...draftLabel, name: input.name.trim() };
      setLabelDrafts((all) => ({ ...all, [product.id]: savedLabel }));
      showToast("success", `${saved.name} and its label saved successfully.`);
    });
  };

  const toggleArchive = async (product: Product, input: ProductInput) => {
    await runSave(`archive-product-${product.id}`, async () => {
      const saved = await saveProduct(product.id, { ...input, active: !product.active });
      setProducts((all) => all.map((p) => p.id === product.id ? saved : p));
      setDrafts((all) => ({ ...all, [product.id]: { ...input, active: saved.active } }));
      showToast("success", `${saved.name} ${saved.active ? "restored" : "archived"} successfully.`);
    });
  };

  const permanentlyDelete = async (product: Product) => {
    await runSave(`delete-product-${product.id}`, async () => {
      await deleteProduct(product.id);
      setProducts((all) => all.filter((p) => p.id !== product.id));
      setDrafts((all) => { const next = { ...all }; delete next[product.id]; return next; });
      setLabelDrafts((all) => { const next = { ...all }; delete next[product.id]; return next; });
      showToast("success", `${product.name} deleted successfully.`);
    });
  };

  const addProduct = async () => {
    if (!newProduct.name.trim()) { showToast("error", "Enter a product name."); return; }
    if (!validDimensions(newLabel)) {
      showToast("error", "Enter all four label dimensions as positive whole numbers before adding the product.");
      return;
    }
    await runSave("add-product", async () => {
      const productInput = { ...newProduct, name: newProduct.name.trim() };
      const label = { ...newLabel, id: `product-${crypto.randomUUID()}`, name: productInput.name };
      const saved = await saveProductWithLabel(null, productInput, labelInput(label));
      setProducts((all) => [...all, saved]);
      setDrafts((all) => ({ ...all, [saved.id]: { ...productInput, active: true } }));
      setLabelDrafts((all) => ({ ...all, [saved.id]: label }));
      setNewProduct(productDefaults);
      setNewLabel(blankLabel("", ""));
      showToast("success", `${saved.name} and its label saved successfully.`);
    });
  };

  const setNewLabelField = <K extends keyof LabelPreset>(key: K, value: LabelPreset[K]) =>
    setNewLabel((label) => ({ ...label, [key]: value, name: newProduct.name.trim() }));

  const visibleProducts = products.filter((p) => showArchived ? !p.active : p.active);

  const labelFields = (label: LabelPreset, change: <K extends keyof LabelPreset>(key: K, value: LabelPreset[K]) => void, disabled: boolean) => (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-muted">Design W mm<input disabled={disabled} className={`${field} mt-1 text-sm font-normal text-ink`} type="number" min="1" step="1" value={Number.isFinite(label.wMm) ? label.wMm : ""} onChange={(e) => change("wMm", e.target.value === "" ? Number.NaN : Number(e.target.value))} /></label>
      <label className="text-xs font-semibold text-muted">Design H mm<input disabled={disabled} className={`${field} mt-1 text-sm font-normal text-ink`} type="number" min="1" step="1" value={Number.isFinite(label.hMm) ? label.hMm : ""} onChange={(e) => change("hMm", e.target.value === "" ? Number.NaN : Number(e.target.value))} /></label>
      <label className="text-xs font-semibold text-muted">Paper W mm<input disabled={disabled} className={`${field} mt-1 text-sm font-normal text-ink`} type="number" min="1" step="1" value={Number.isFinite(label.paperWMm) ? label.paperWMm : ""} onChange={(e) => change("paperWMm", e.target.value === "" ? Number.NaN : Number(e.target.value))} /></label>
      <label className="text-xs font-semibold text-muted">Paper H mm<input disabled={disabled} className={`${field} mt-1 text-sm font-normal text-ink`} type="number" min="1" step="1" value={Number.isFinite(label.paperHMm) ? label.paperHMm : ""} onChange={(e) => change("paperHMm", e.target.value === "" ? Number.NaN : Number(e.target.value))} /></label>
      <label className="text-xs font-semibold text-muted">Paper<select disabled={disabled} className={`${field} mt-1 text-sm font-normal text-ink`} value={label.paper} onChange={(e) => change("paper", e.target.value as LabelPaper)}><option value="gaps">White sticker</option><option value="transparent">Transparent sticker</option></select></label>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pt-4 pb-12 sm:px-6 sm:pt-6 lg:px-8">
      <PageHeader title="Products" subtitle="shelf life and labels" />
      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <p className="border-b border-line px-5 py-3 text-xs text-muted">Each product and its label settings are managed together. Archived products stay in lot history.</p>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider">{showArchived ? "Archived products" : "Products in use"}</h2>
          <button className="text-sm font-semibold text-accent" type="button" onClick={() => setShowArchived((v) => !v)}>{showArchived ? "Show in use" : "Show archive"}</button>
        </div>
        {visibleProducts.map((product) => {
          const d = drafts[product.id] ?? productDefaults;
          const label = labelDrafts[product.id] ?? blankLabel(`product-${product.id}`, d.name);
          const rowBusy = busyActions.has(`save-product-${product.id}`) || busyActions.has(`archive-product-${product.id}`) || busyActions.has(`delete-product-${product.id}`);
          return <div key={product.id} className="border-b border-line p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr]">
              <label className="text-xs font-semibold text-muted">Name<input disabled={rowBusy} className={`${field} mt-1 text-sm font-normal text-ink`} value={d.name} onChange={(e) => setProductField(product.id, "name", e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted">Shelf months<input disabled={rowBusy} className={`${field} mt-1 text-sm font-normal text-ink`} type="number" min="0" value={d.shelfMonths} onChange={(e) => setProductField(product.id, "shelfMonths", Number(e.target.value))} /></label>
              <label className="text-xs font-semibold text-muted">+ days<input disabled={rowBusy} className={`${field} mt-1 text-sm font-normal text-ink`} type="number" min="0" value={d.shelfDays} onChange={(e) => setProductField(product.id, "shelfDays", Number(e.target.value))} /></label>
              <label className="text-xs font-semibold text-muted">Surface (not printed)<select disabled={rowBusy} className={`${field} mt-1 text-sm font-normal text-ink`} value={surfaceOption(d.surface)} onChange={(e) => setProductField(product.id, "surface", e.target.value)}><option value="">Choose surface</option><option value="Box">Box</option><option value="Bottle">Bottle</option></select></label>
            </div>
            {labelFields(label, (key, value) => setLabelField(product.id, key, value), rowBusy)}
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busyActions.has(`save-product-${product.id}`)} className="inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={() => persistProduct(product, { ...d, active: product.active })}>{savingContent(busyActions.has(`save-product-${product.id}`), "Save")}</button>
              <button type="button" disabled={busyActions.has(`archive-product-${product.id}`)} className="h-10 rounded-lg border border-line px-4 text-sm disabled:opacity-50" onClick={() => toggleArchive(product, d)}>{savingContent(busyActions.has(`archive-product-${product.id}`), product.active ? "Archive" : "Restore")}</button>
              {!product.active && <button type="button" disabled={busyActions.has(`delete-product-${product.id}`)} className="h-10 rounded-lg border border-err/40 px-4 text-sm text-err disabled:opacity-50" onClick={() => setDeleteCandidate(product)}>{savingContent(busyActions.has(`delete-product-${product.id}`), "Delete")}</button>}
            </div>
          </div>;
        })}
        {!showArchived && <div className="bg-page/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr]">
            <label className="text-xs font-semibold text-muted">New product<input disabled={busyActions.has("add-product")} className={`${field} mt-1 text-sm font-normal text-ink`} placeholder="e.g. Body oil" value={newProduct.name} onChange={(e) => { const name = e.target.value; setNewProduct({ ...newProduct, name }); setNewLabel((label) => ({ ...label, name })); }} /></label>
            <label className="text-xs font-semibold text-muted">Shelf months<input disabled={busyActions.has("add-product")} className={`${field} mt-1 text-sm font-normal text-ink`} type="number" min="0" value={newProduct.shelfMonths} onChange={(e) => setNewProduct({ ...newProduct, shelfMonths: Number(e.target.value) })} /></label>
            <label className="text-xs font-semibold text-muted">+ days<input disabled={busyActions.has("add-product")} className={`${field} mt-1 text-sm font-normal text-ink`} type="number" min="0" value={newProduct.shelfDays} onChange={(e) => setNewProduct({ ...newProduct, shelfDays: Number(e.target.value) })} /></label>
            <label className="text-xs font-semibold text-muted">Surface (not printed)<select disabled={busyActions.has("add-product")} className={`${field} mt-1 text-sm font-normal text-ink`} value={surfaceOption(newProduct.surface)} onChange={(e) => setNewProduct({ ...newProduct, surface: e.target.value })}><option value="">Choose surface</option><option value="Box">Box</option><option value="Bottle">Bottle</option></select></label>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Label dimensions and paper · {newProduct.name.trim() || "new product"}</p>
          {labelFields(newLabel, (key, value) => setNewLabelField(key, value), busyActions.has("add-product"))}
          <button type="button" disabled={busyActions.has("add-product")} className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={addProduct}>{savingContent(busyActions.has("add-product"), "Add product")}</button>
        </div>}
      </section>
      <dialog ref={deleteDialogRef} onClose={() => setDeleteCandidate(null)}
        onCancel={(event) => { event.preventDefault(); setDeleteCandidate(null); }}
        onClick={(event) => { if (event.target === deleteDialogRef.current) setDeleteCandidate(null); }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-black/40">
        {deleteCandidate && <div className="p-5">
          <h2 className="text-lg font-semibold">Delete {deleteCandidate.name}?</h2>
          <p className="mt-2 text-sm text-muted">This permanently removes the archived product. Products with print history cannot be deleted and will stay archived.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-page" onClick={() => setDeleteCandidate(null)}>Cancel</button>
            <button type="button" className="h-10 rounded-lg bg-err px-4 text-sm font-semibold text-white hover:brightness-110"
              onClick={() => { const product = deleteCandidate; setDeleteCandidate(null); void permanentlyDelete(product); }}>Delete product</button>
          </div>
        </div>}
      </dialog>
    </main>
  );
}
