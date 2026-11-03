"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { showDay } from "@/components/LotSearch";
import { PageHeader } from "@/components/Nav";
import { addMaterial, deleteMaterial, errorText, fetchLot } from "@/lib/api";
import { getPreset } from "@/lib/label";

type Detail = Awaited<ReturnType<typeof fetchLot>>;

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const inputCls = "h-10 min-w-0 rounded-lg border border-line bg-white px-2.5 text-sm outline-none focus:border-accent";

/** One lot: what was printed and which raw material batches went into it. */
export function LotDetail() {
  const id = Number(useParams<{ id: string }>().id);
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ material: "", supplier: "", batch: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => fetchLot(id).then((r) => { setD(r); setErr(null); }, (e) => setErr(errorText(e))), [id]);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addMaterial(id, { material: form.material, supplier: form.supplier || null, batch: form.batch });
      setForm({ material: "", supplier: "", batch: "" });
      await load();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  const remove = async (materialId: number) => {
    try { await deleteMaterial(id, materialId); await load(); } catch (e) { setErr(errorText(e)); }
  };

  const lot = d?.lot;
  const stats = lot && [
    ["Product", lot.productName ?? "—"],
    ["Made", showDay(lot.date)],
    ["Expires", lot.expDate ? showDay(lot.expDate) : "—"],
    ["Labels printed", String(lot.printed)],
    ["Print jobs", String(lot.jobs)],
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
      <PageHeader title="Lot" subtitle={lot ? (lot.lot ?? lot.code) : undefined} />

      <div className="flex flex-col gap-3 sm:gap-4">
        <Link href="/lots" className="px-4 text-sm font-semibold text-accent hover:underline sm:px-0">← All lots</Link>
        {err && <p className="px-4 text-sm text-err sm:px-0">{err}</p>}

        {lot && stats && (
          <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
            <p className="font-mono text-2xl font-semibold tracking-wide">{lot.lot ?? lot.code}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {stats.map(([k, v]) => (
                <div key={k} className="rounded-lg bg-page px-3 py-2">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {d && (
          <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Raw materials used</h2>
            <p className="mt-1 text-xs text-muted">The supplier batch numbers that went into this lot. Search them on the Lots page.</p>

            {d.materials.length > 0 && (
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                {d.materials.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                    <span className="min-w-32 flex-1 font-semibold">{m.material}</span>
                    <span className="text-muted">{m.supplier ?? "—"}</span>
                    <span className="font-mono">{m.batch}</span>
                    <button type="button" onClick={() => remove(m.id)} aria-label={`Remove ${m.material}`}
                      className="h-8 rounded-md px-2 text-xs text-muted hover:text-err">Remove</button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={add} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <input required placeholder="Material, e.g. Hyaluronic acid" aria-label="Material" value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })} className={inputCls} />
              <input placeholder="Supplier (optional)" aria-label="Supplier" value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputCls} />
              <input required placeholder="Supplier batch no." aria-label="Supplier batch number" value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })} className={`${inputCls} font-mono`} />
              <button type="submit" disabled={saving}
                className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">Add</button>
            </form>
          </section>
        )}

        {d && (
          <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Print jobs</h2>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-page text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Printed</th>
                    <th className="px-3 py-2.5 font-semibold">Label type</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Note</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Labels</th>
                  </tr>
                </thead>
                <tbody>
                  {d.prints.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{dateTime(p.printedAt)}</td>
                      <td className="px-3 py-2.5">{getPreset(p.preset).name}</td>
                      <td className="px-3 py-2.5 capitalize">{p.status === "pending" ? "Not finished" : p.status}</td>
                      <td className="px-3 py-2.5 text-muted">{p.note ?? ""}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{p.quantity}</td>
                    </tr>
                  ))}
                  {d.prints.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">No print jobs.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
