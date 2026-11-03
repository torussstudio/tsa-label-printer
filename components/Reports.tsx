"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/Nav";
import {
  errorText, fetchPrints, fetchProducts, fetchStats,
  type PrintJob, type Product, type StatsGroup, type StatsRow,
} from "@/lib/api";
import { addDays, getPreset, parseDay, toDay } from "@/lib/label";

type Range = { from: string; to: string };

/**
 * The periods to pick from, worked out from today's date on this device.
 * A year is shown month by month; everything shorter day by day.
 */
const PERIODS: { id: string; label: string; group: StatsGroup; make: (d: Date) => Range }[] = [
  { id: "week", label: "This week", group: "day", make: (d) => {
    const monday = addDays(d, -((d.getDay() + 6) % 7));
    return { from: toDay(monday), to: toDay(addDays(monday, 6)) };
  } },
  { id: "this-month", label: "This month", group: "day", make: (d) => ({ from: toDay(new Date(d.getFullYear(), d.getMonth(), 1)), to: toDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }) },
  { id: "last-month", label: "Last month", group: "day", make: (d) => ({ from: toDay(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: toDay(new Date(d.getFullYear(), d.getMonth(), 0)) }) },
  { id: "this-year", label: "This year", group: "month", make: (d) => ({ from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` }) },
];

function periodLabel(period: string, group: StatsGroup, short = false) {
  const d = parseDay(period);
  if (group === "month") return d.toLocaleDateString("en-GB", short ? { month: "short" } : { month: "long", year: "numeric" });
  return short ? String(d.getDate()) : d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

/** Every day (or month) in the range, so days without printing show as gaps in the chart. */
function periodsIn(range: Range, group: StatsGroup): string[] {
  const out: string[] = [];
  const end = parseDay(range.to);
  if (group === "month") {
    for (let d = parseDay(range.from.slice(0, 8) + "01"); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) out.push(toDay(d));
  } else {
    for (let d = parseDay(range.from); d <= end; d = addDays(d, 1)) out.push(toDay(d));
  }
  return out;
}

/** "Nice" top for the y axis: 1, 2 or 5 × 10ⁿ at or above the largest value. */
function niceMax(v: number) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((n) => n >= v) ?? 10 * p;
}

/** Labels per day or month. One series, so the title names it; hover or focus a bar for its numbers. */
function LabelsChart({ rows, range, group }: { rows: StatsRow[]; range: Range; group: StatsGroup }) {
  const periods = periodsIn(range, group);
  const byPeriod = new Map(rows.map((r) => [r.period, r]));
  const top = niceMax(Math.max(0, ...rows.map((r) => r.printed)));
  const ticks = [0, top / 2, top];
  const labelEvery = Math.ceil(periods.length / 16); // keep the x labels from colliding

  return (
    <figure>
      <figcaption className="mb-4 text-sm font-semibold">Labels printed per {group}</figcaption>
      <div className="relative flex h-44 pl-9">
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 flex items-center gap-2" style={{ bottom: `calc(${(t / top) * 100}% - 0.5px)` }}>
            <span className="w-7 text-right text-[10px] text-muted tabular-nums">{t}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        ))}
        <div className="relative flex flex-1 items-end gap-0.5">
          {periods.map((p, i) => {
            const n = byPeriod.get(p)?.printed ?? 0;
            return (
              <div key={p} tabIndex={0} aria-label={`${periodLabel(p, group)}: ${n} labels`}
                className="group relative flex h-full flex-1 items-end justify-center outline-none">
                <div className="w-full max-w-6 rounded-t bg-accent transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                  style={{ height: n ? `max(2px, ${(n / top) * 100}%)` : 0 }} />
                <div className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block ${
                  i < periods.length / 2 ? "left-0" : "right-0"}`}>
                  <span className="font-semibold">{periodLabel(p, group)}</span> · <span className="tabular-nums">{n} labels</span>
                </div>
                {i % labelEvery === 0 && (
                  <span className="absolute top-full mt-1 text-[10px] text-muted tabular-nums">{periodLabel(p, group, true)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="h-5" />
    </figure>
  );
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Downloads every print job in the range as a CSV file (opens in Excel). */
function downloadCsv(jobs: PrintJob[], range: Range) {
  const head = ["Made", "Lot", "Product", "Label type", "Printed at", "Status", "Labels", "Expires", "Note"];
  const lines = jobs.map((j) => [
    j.lotDate, j.lot, j.productName, getPreset(j.preset).name, new Date(j.printedAt).toLocaleString("en-GB"),
    j.status, j.quantity, j.expDate, j.note,
  ].map(csvCell).join(","));
  const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `labels-${range.from}-to-${range.to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Labels printed this week / month / year, per product. For any other dates, see the Lots page. */
export function Reports() {
  const [periodId, setPeriodId] = useState(PERIODS[1].id);
  const [productId, setProductId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<StatsRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1];
  const group = period.group;
  // Worked out on the client only, so the dates follow the device's clock
  const [range, setRange] = useState<Range | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the client clock
  useEffect(() => setRange(period.make(new Date())), [period]);

  useEffect(() => { fetchProducts().then(setProducts, () => { /* filter just stays empty */ }); }, []);

  useEffect(() => {
    if (!range) return;
    let cancelled = false;
    fetchStats(range.from, range.to, group, productId)
      .then((r) => { if (!cancelled) { setRows(r.rows); setErr(null); } })
      .catch((e) => { if (!cancelled) setErr(errorText(e)); });
    return () => { cancelled = true; };
  }, [range, group, productId]);

  const printed = rows?.reduce((s, r) => s + r.printed, 0) ?? 0;
  const lots = new Set(rows?.flatMap((r) => r.lots)).size;

  const onExport = async () => {
    if (!range) return;
    setExporting(true);
    try {
      downloadCsv(await fetchPrints(range.from, range.to, "lot", productId), range);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setExporting(false);
    }
  };

  const chip = (on: boolean) =>
    `h-10 rounded-lg border px-3.5 text-sm font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-[#f6f5f1]"}`;

  return (
    <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
      <PageHeader title="Reports" subtitle="labels printed" />

      <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPeriodId(p.id)} className={chip(p.id === periodId)}>{p.label}</button>
          ))}
          <select value={productId ?? ""} aria-label="Product" onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)}
            className="h-10 rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-accent">
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="button" onClick={onExport} disabled={!range || exporting}
            className="ml-auto h-10 rounded-lg px-3 text-sm font-semibold text-accent hover:underline disabled:opacity-45">
            {exporting ? "Preparing…" : "Download CSV"}
          </button>
        </div>

        {err && <p className="mt-3 text-sm text-err">{err}</p>}

        <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
          {([["Labels printed", printed], ["Lots", lots]] as const).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-page px-2 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        {rows && range && rows.length > 0 && (
          <div className="mt-5"><LabelsChart rows={rows} range={range} group={group} /></div>
        )}

        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-page text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{group === "month" ? "Month" : "Day"}</th>
                <th className="px-3 py-2.5 font-semibold">By product</th>
                <th className="px-3 py-2.5 text-right font-semibold">Labels</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.period} className="border-t border-line align-top">
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{periodLabel(r.period, group)}</td>
                  <td className="px-3 py-2.5 text-muted">{Object.entries(r.products).map(([name, n]) => `${name} ${n}`).join(" · ")}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.printed}</td>
                </tr>
              ))}
              {rows?.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-muted">No labels printed in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Counts finished prints only. For other dates, use the date filter on the Lots page.</p>
      </section>
    </div>
  );
}
