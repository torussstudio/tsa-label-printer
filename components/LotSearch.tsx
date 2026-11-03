"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/Nav";
import { errorText, searchLots, type LotSummary } from "@/lib/api";
import { formatDate, parseDay } from "@/lib/label";

export const showDay = (d: string) => formatDate(parseDay(d), "dd.mm.yyyy");

/** Find a lot by its code, or every lot that used a raw material batch. */
export function LotSearch() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LotSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      searchLots(q.trim())
        .then((r) => { if (!cancelled) { setRows(r); setErr(null); } })
        .catch((e) => { if (!cancelled) setErr(errorText(e)); });
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
      <PageHeader title="Lots" subtitle="traceability" />

      <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
          Search
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus
            placeholder="Lot code (TSA26K7M2QX) or ingredient batch number"
            className="h-11 rounded-xl border border-line bg-white px-3 text-base font-normal text-ink outline-none focus:border-accent" />
        </label>
        <p className="mt-1.5 text-xs text-muted">
          {q ? "Lots whose code, or a raw material batch used in them, matches." : "Latest lots. Type to search."}
        </p>

        {err && <p className="mt-3 text-sm text-err">{err}</p>}

        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-page text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Lot</th>
                <th className="px-3 py-2.5 font-semibold">Product</th>
                <th className="px-3 py-2.5 font-semibold">Made</th>
                <th className="px-3 py-2.5 font-semibold">Expires</th>
                <th className="px-3 py-2.5 text-right font-semibold">Good labels</th>
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
                  <td className="px-3 py-2.5">{l.productName ?? <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2.5 tabular-nums">{showDay(l.date)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{l.expDate ? showDay(l.expDate) : <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{l.printed - l.wasted}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{l.materials || <span className="text-muted">—</span>}</td>
                </tr>
              ))}
              {rows?.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">{q ? "No lot matches." : "No lots yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
