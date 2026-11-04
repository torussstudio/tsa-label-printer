// "use client";

// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { PageHeader } from "@/components/Nav";
// import { errorText, searchLots, type LotSummary, type LotTotals } from "@/lib/api";
// import { addDays, formatDate, parseDay, toDay } from "@/lib/label";

// export const showDay = (d: string) => formatDate(parseDay(d), "dd.mm.yyyy");

// type Range = { from: string; to: string }; // "" = open

// /** Quick day ranges, from this device's date. */
// const QUICK: { id: string; label: string; make: () => Range }[] = [
//   { id: "all", label: "All dates", make: () => ({ from: "", to: "" }) },
//   { id: "today", label: "Today", make: () => { const d = toDay(new Date()); return { from: d, to: d }; } },
//   { id: "yesterday", label: "Yesterday", make: () => { const d = toDay(addDays(new Date(), -1)); return { from: d, to: d }; } },
//   { id: "this-month", label: "This month", make: () => { const d = new Date(); return { from: toDay(new Date(d.getFullYear(), d.getMonth(), 1)), to: toDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }; } },
//   { id: "last-month", label: "Last month", make: () => { const d = new Date(); return { from: toDay(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: toDay(new Date(d.getFullYear(), d.getMonth(), 0)) }; } },
// ];

// function rangeText({ from, to }: Range) {
//   if (!from && !to) return "All dates";
//   if (from && from === to) return showDay(from);
//   return `${from ? showDay(from) : "…"} – ${to ? showDay(to) : "…"}`;
// }

// /** Find lots by code, by a raw material batch, and by the day they were made, with totals for the range. */
// export function LotSearch() {
//   const [q, setQ] = useState("");
//   const [range, setRange] = useState<Range>({ from: "", to: "" });
//   const [rows, setRows] = useState<LotSummary[] | null>(null);
//   const [totals, setTotals] = useState<LotTotals | null>(null);
//   const [more, setMore] = useState(false);
//   const [err, setErr] = useState<string | null>(null);
//   const bad = !!range.from && !!range.to && range.from > range.to;

//   useEffect(() => {
//     if (bad) return;
//     let cancelled = false;
//     const t = setTimeout(() => {
//       searchLots(q.trim(), range.from, range.to)
//         .then((r) => { if (!cancelled) { setRows(r.lots); setTotals(r.totals); setMore(r.more); setErr(null); } })
//         .catch((e) => { if (!cancelled) setErr(errorText(e)); });
//     }, q ? 250 : 0);
//     return () => { cancelled = true; clearTimeout(t); };
//   }, [q, range, bad]);

//   // Picking only a "From" day filters that one day
//   const setFrom = (from: string) => setRange((r) => ({ from, to: !r.to || (from && r.to < from) ? from : r.to }));
//   const activeQuick = QUICK.find((x) => { const r = x.make(); return r.from === range.from && r.to === range.to; })?.id;
//   const chip = (on: boolean) =>
//     `h-9 rounded-lg border px-3 text-sm font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-[#f6f5f1]"}`;
//   const dateCls = "h-9 rounded-lg border border-line bg-white px-2 text-sm font-normal text-ink outline-none focus:border-accent";

//   return (
//     <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
//       <PageHeader title="Lots" subtitle="traceability" />

//       <div className="flex flex-col gap-3 sm:gap-4">
//         <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
//           <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search lots"
//             placeholder="Search: lot code (TSA26K7M2QX) or ingredient batch number"
//             className="h-11 w-full rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-accent" />

//           <div className="mt-3 flex flex-wrap items-end gap-2">
//             {QUICK.map((x) => (
//               <button key={x.id} type="button" onClick={() => setRange(x.make())} className={chip(activeQuick === x.id)}>{x.label}</button>
//             ))}
//             <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
//               From
//               <input type="date" value={range.from} onChange={(e) => setFrom(e.target.value)} className={dateCls} />
//             </label>
//             <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
//               To
//               <input type="date" value={range.to} min={range.from || undefined}
//                 onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className={dateCls} />
//             </label>
//           </div>
//           {bad && <p className="mt-2 text-sm text-err">&quot;From&quot; must be before &quot;To&quot;.</p>}
//           {err && <p className="mt-2 text-sm text-err">{err}</p>}
//         </section>

//         {/* Totals for everything the filters match */}
//         {totals && (
//           <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
//             <div className="flex flex-wrap items-baseline justify-between gap-2">
//               <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Printed · {rangeText(range)}</h2>
//               {q && <p className="text-xs text-muted">matching &quot;{q.trim()}&quot;</p>}
//             </div>
//             <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
//               {([["Labels printed", totals.printed], ["Lots", totals.lots]] as const).map(([k, v]) => (
//                 <div key={k} className="rounded-lg bg-page px-2 py-2.5">
//                   <dt className="text-xs text-muted">{k}</dt>
//                   <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
//                 </div>
//               ))}
//             </dl>
//             {totals.products.length > 0 && (
//               <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
//                 {totals.products.map((p) => (
//                   <li key={p.name} className="rounded-lg border border-line px-2.5 py-1">
//                     <span className="font-semibold">{p.name}</span>{" "}
//                     <span className="tabular-nums">{p.printed}</span>{" "}
//                     <span className="text-xs text-muted">({p.lots} lot{p.lots === 1 ? "" : "s"})</span>
//                   </li>
//                 ))}
//               </ul>
//             )}
//           </section>
//         )}

//         <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
//           <div className="overflow-x-auto rounded-xl border border-line">
//             <table className="w-full min-w-[620px] text-left text-sm">
//               <thead className="bg-page text-xs uppercase tracking-wider text-muted">
//                 <tr>
//                   <th className="px-3 py-2.5 font-semibold">Lot</th>
//                   <th className="px-3 py-2.5 font-semibold">Product</th>
//                   <th className="px-3 py-2.5 font-semibold">Made</th>
//                   <th className="px-3 py-2.5 font-semibold">Expires</th>
//                   <th className="px-3 py-2.5 text-right font-semibold">Labels</th>
//                   <th className="px-3 py-2.5 text-right font-semibold">Materials</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {rows?.map((l) => (
//                   <tr key={l.id} className="border-t border-line align-top hover:bg-page/60">
//                     <td className="px-3 py-2.5">
//                       <Link href={`/lots/${l.id}`} className="font-mono font-semibold text-accent hover:underline">{l.lot ?? l.code}</Link>
//                       {l.matched && <p className="mt-0.5 text-xs text-muted">Used {l.matched}</p>}
//                     </td>
//                     <td className="px-3 py-2.5">{l.productName ?? <span className="text-muted">—</span>}</td>
//                     <td className="px-3 py-2.5 tabular-nums">{showDay(l.date)}</td>
//                     <td className="px-3 py-2.5 tabular-nums">{l.expDate ? showDay(l.expDate) : <span className="text-muted">—</span>}</td>
//                     <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{l.printed}</td>
//                     <td className="px-3 py-2.5 text-right tabular-nums">{l.materials || <span className="text-muted">—</span>}</td>
//                   </tr>
//                 ))}
//                 {rows?.length === 0 && (
//                   <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No lots for these filters.</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//           {more && <p className="mt-2 text-xs text-muted">Showing the latest 50 lots. The totals above count all of them.</p>}
//         </section>
//       </div>
//     </div>
//   );
// }



"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/Nav";
import { showToast } from "@/components/Toast";
import { errorText, searchLots, type LotSummary, type LotTotals } from "@/lib/api";
import { LOT_KINDS, PRESETS, addDays, formatDate, parseDay, toDay } from "@/lib/label";

export const showDay = (d: string) => formatDate(parseDay(d), "dd.mm.yyyy");

/** Labels per label type (Serum box, Cream box, Cleanser box, Bottle) as tiles. Types with none show 0. */
export function TypeTiles({ types }: { types: Record<string, number> | null | undefined }) {
  return (
    <dl className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
      {PRESETS.map((p) => (
        <div key={p.id} className="rounded-lg bg-page px-2 py-2.5">
          <dt className="text-xs text-muted">{p.name}</dt>
          <dd className="text-xl font-semibold tabular-nums">{types?.[p.id] ?? 0}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Bottle 100 · Cream box 100": label types with nothing printed are left out. */
export const typesText = (types: Record<string, number> | null | undefined) =>
  PRESETS.filter((p) => types?.[p.id]).map((p) => `${p.name} ${types?.[p.id]}`).join(" · ");

type Range = { from: string; to: string }; // "" = open

/** Quick day ranges, from this device's date. */
const QUICK: { id: string; label: string; make: () => Range }[] = [
  { id: "all", label: "All dates", make: () => ({ from: "", to: "" }) },
  { id: "today", label: "Today", make: () => { const d = toDay(new Date()); return { from: d, to: d }; } },
  { id: "yesterday", label: "Yesterday", make: () => { const d = toDay(addDays(new Date(), -1)); return { from: d, to: d }; } },
  { id: "this-month", label: "This month", make: () => { const d = new Date(); return { from: toDay(new Date(d.getFullYear(), d.getMonth(), 1)), to: toDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }; } },
  { id: "last-month", label: "Last month", make: () => { const d = new Date(); return { from: toDay(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: toDay(new Date(d.getFullYear(), d.getMonth(), 0)) }; } },
];

function rangeText({ from, to }: Range) {
  if (!from && !to) return "All dates";
  if (from && from === to) return showDay(from);
  return `${from ? showDay(from) : "…"} – ${to ? showDay(to) : "…"}`;
}

/** Find lots by code, by a raw material batch, and by the day they were made, with totals for the range. */
export function LotSearch() {
  const [q, setQ] = useState("");
  const [range, setRange] = useState<Range>({ from: "", to: "" });
  const [rows, setRows] = useState<LotSummary[] | null>(null);
  const [totals, setTotals] = useState<LotTotals | null>(null);
  const [more, setMore] = useState(false);
  const bad = !!range.from && !!range.to && range.from > range.to;

  useEffect(() => {
    if (bad) showToast("error", '"From" must be before "To".');
  }, [bad]);

  useEffect(() => {
    if (bad) return;
    let cancelled = false;
    const t = setTimeout(() => {
      searchLots(q.trim(), range.from, range.to)
        .then((r) => { if (!cancelled) { setRows(r.lots); setTotals(r.totals); setMore(r.more); } })
        .catch((e) => { if (!cancelled) showToast("error", errorText(e)); });
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, range, bad]);

  // Picking only a "From" day filters that one day
  const setFrom = (from: string) => setRange((r) => ({ from, to: !r.to || (from && r.to < from) ? from : r.to }));
  const activeQuick = QUICK.find((x) => { const r = x.make(); return r.from === range.from && r.to === range.to; })?.id;
  const chip = (on: boolean) =>
    `h-9 rounded-lg border px-3 text-sm font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-[#f6f5f1]"}`;
  const dateCls = "h-9 rounded-lg border border-line bg-white px-2 text-sm font-normal text-ink outline-none focus:border-accent";

  return (
    <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
      <PageHeader title="Lots" subtitle="traceability" />

      <div className="flex flex-col gap-3 sm:gap-4">
        <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search lots"
            placeholder="Search: lot code (TSA26K7M2QX) or ingredient batch number"
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-accent" />

          <div className="mt-3 flex flex-wrap items-end gap-2">
            {QUICK.map((x) => (
              <button key={x.id} type="button" onClick={() => setRange(x.make())} className={chip(activeQuick === x.id)}>{x.label}</button>
            ))}
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              From
              <input type="date" value={range.from} onChange={(e) => setFrom(e.target.value)} className={dateCls} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              To
              <input type="date" value={range.to} min={range.from || undefined}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className={dateCls} />
            </label>
          </div>
        </section>

        {/* Totals for everything the filters match */}
        {totals && (
          <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Printed · {rangeText(range)}</h2>
              {q && <p className="text-xs text-muted">matching &quot;{q.trim()}&quot;</p>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
              {([["Labels printed", totals.printed], ["Lots", totals.lots]] as const).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-page px-2 py-2.5">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <TypeTiles types={totals.types} />
          </section>
        )}

        <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-page text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Lot</th>
                  <th className="px-3 py-2.5 font-semibold">Product</th>
                  <th className="px-3 py-2.5 font-semibold">Made</th>
                  <th className="px-3 py-2.5 font-semibold">Expires</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Labels</th>
                  <th className="px-3 py-2.5 font-semibold">By label type</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Materials</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((l) => (
                  <tr key={l.id} className="border-t border-line align-top hover:bg-page/60">
                    <td className="px-3 py-2.5">
                      <Link href={`/lots/${l.id}`} className="font-mono font-semibold text-accent hover:underline">{l.lot ?? l.code}</Link>
                      {l.matched && <p className="mt-0.5 text-xs text-muted">Used {l.matched}</p>}
                    </td>
                    <td className="px-3 py-2.5">{l.kind ? LOT_KINDS[l.kind] : <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-2.5 tabular-nums">{showDay(l.date)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{l.expDate ? showDay(l.expDate) : <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{l.printed}</td>
                    <td className="px-3 py-2.5 text-muted">{typesText(l.byType) || "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{l.materials || <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
                {rows?.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No lots for these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {more && <p className="mt-2 text-xs text-muted">Showing the latest 50 lots. The totals above count all of them.</p>}
        </section>
      </div>
    </div>
  );
}
