"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/Nav";
import {
  errorText, fetchPrints, fetchProducts, fetchStats,
  type PrintJob, type Product, type StatsGroup, type StatsRow,
} from "@/lib/api";
import { addDays, getPreset, parseDay, toDay } from "@/lib/label";

type Range = { from: string; to: string };

/** Quick ranges, worked out from today's date on this device. */
const RANGES: { id: string; label: string; make: (d: Date) => Range }[] = [
  { id: "this-month", label: "This month", make: (d) => ({ from: toDay(new Date(d.getFullYear(), d.getMonth(), 1)), to: toDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }) },
  { id: "last-month", label: "Last month", make: (d) => ({ from: toDay(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: toDay(new Date(d.getFullYear(), d.getMonth(), 0)) }) },
  { id: "this-year", label: "This year", make: (d) => ({ from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` }) },
];

/** Most bars the chart draws; a longer day range asks for month view. */
const MAX_BARS = 92;

function periodLabel(period: string, group: StatsGroup, short = false) {
  const d = parseDay(period);
  if (group === "month") return d.toLocaleDateString("en-GB", short ? { month: "short" } : { month: "long", year: "numeric" });
  return short ? String(d.getDate()) : d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

/** Every day (or month) in the range, so days without printing show as gaps in the chart. */
function periodsIn(range: Range, group: StatsGroup): string[] {
  const out: string[] = [];
  const end = parseDay(range.to);
  if (group === "month") {
    for (let d = parseDay(range.from.slice(0, 8) + "01"); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) out.push(toDay(d));
  } else {
    for (let d = parseDay(range.from); d <= end && out.length <= MAX_BARS; d = addDays(d, 1)) out.push(toDay(d));
  }
  return out;
}

/** "Nice" top for the y axis: 1, 2 or 5 × 10ⁿ at or above the largest value. */
function niceMax(v: number) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((n) => n >= v) ?? 10 * p;
}

/** Good labels per day or month. One series, so the title names it; hover or focus a bar for its numbers. */
function GoodChart({ rows, range, group }: { rows: StatsRow[]; range: Range; group: StatsGroup }) {
  const periods = periodsIn(range, group);
  if (periods.length > MAX_BARS) return <p className="py-6 text-center text-sm text-muted">Pick 3 months or less to see the day chart, or switch to month wise.</p>;
  const byPeriod = new Map(rows.map((r) => [r.period, r]));
  const top = niceMax(Math.max(0, ...rows.map((r) => r.good)));
  const ticks = [0, top / 2, top];
  const labelEvery = Math.ceil(periods.length / 16); // keep the x labels from colliding

  return (
    <figure>
      <figcaption className="mb-4 text-sm font-semibold">Good labels per {group}</figcaption>
      <div className="relative flex h-48 pl-9">
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 flex items-center gap-2" style={{ bottom: `calc(${(t / top) * 100}% - 0.5px)` }}>
            <span className="w-7 text-right text-[10px] text-muted tabular-nums">{t}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        ))}
        <div className="relative flex flex-1 items-end gap-0.5">
          {periods.map((p, i) => {
            const r = byPeriod.get(p);
            const good = r?.good ?? 0;
            return (
              <div key={p} tabIndex={0} aria-label={`${periodLabel(p, group)}: ${good} good labels`}
                className="group relative flex h-full flex-1 items-end justify-center outline-none">
                <div className="w-full max-w-6 rounded-t bg-accent transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                  style={{ height: good ? `max(2px, ${(good / top) * 100}%)` : 0 }} />
                <div className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block ${
                  i < periods.length / 2 ? "left-0" : "right-0"}`}>
                  <p className="font-semibold">{periodLabel(p, group)}</p>
                  <p className="tabular-nums">{good} good · {r?.wasted ?? 0} wasted · {r?.jobs ?? 0} jobs</p>
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
  const head = ["Made", "Lot", "Product", "Label type", "Printed at", "Status", "Labels", "Wasted", "Good", "Expires", "Note"];
  const lines = jobs.map((j) => [
    j.lotDate, j.lot, j.productName, getPreset(j.preset).name, new Date(j.printedAt).toLocaleString("en-GB"),
    j.status, j.quantity, j.wasted, j.status === "printed" ? j.quantity - j.wasted : 0, j.expDate, j.note,
  ].map(csvCell).join(","));
  const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `labels-${range.from}-to-${range.to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** This month so far vs the same days of last month. */
function MonthCompare({ productId }: { productId: number | null }) {
  const [data, setData] = useState<{ now: number; before: number; day: number } | null>(null);
  useEffect(() => {
    const d = new Date();
    const from = toDay(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const lastSameDay = toDay(new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth(), 0).getDate())));
    const thisStart = toDay(new Date(d.getFullYear(), d.getMonth(), 1));
    let cancelled = false;
    fetchStats(from, toDay(d), "day", productId).then(({ rows }) => {
      if (cancelled) return;
      const sum = (a: string, b: string) => rows.filter((r) => r.period >= a && r.period <= b).reduce((s, r) => s + r.good, 0);
      setData({ now: sum(thisStart, toDay(d)), before: sum(from, lastSameDay), day: d.getDate() });
    }, () => { /* the main error message covers it */ });
    return () => { cancelled = true; };
  }, [productId]);

  if (!data) return null;
  const change = data.before ? Math.round(((data.now - data.before) / data.before) * 100) : null;
  return (
    <div className="rounded-lg bg-page px-3 py-2.5 text-sm">
      <span className="font-semibold">This month so far: {data.now}</span>
      <span className="text-muted"> · first {data.day} day{data.day === 1 ? "" : "s"} of last month: {data.before}</span>
      {change !== null && (
        <span className={`ml-2 font-semibold ${change >= 0 ? "text-ok" : "text-err"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
        </span>
      )}
    </div>
  );
}

export function Reports() {
  const [group, setGroup] = useState<StatsGroup>("day");
  const [range, setRange] = useState<Range | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<StatsRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // The query the shown rows belong to; while it differs from the current one, a load is running
  const query = range ? `${range.from}|${range.to}|${group}|${productId}` : null;
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = query !== loadedQuery;

  // Default range is set on the client, so "this month" follows the device's date
  // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the client clock
  useEffect(() => setRange(RANGES[0].make(new Date())), []);
  useEffect(() => { fetchProducts().then(setProducts, () => { /* filter just stays empty */ }); }, []);

  useEffect(() => {
    if (!range || range.from > range.to) return;
    let cancelled = false;
    const q = `${range.from}|${range.to}|${group}|${productId}`;
    fetchStats(range.from, range.to, group, productId)
      .then((r) => { if (!cancelled) { setRows(r.rows); setErr(null); } })
      .catch((e) => { if (!cancelled) setErr(errorText(e)); })
      .finally(() => { if (!cancelled) setLoadedQuery(q); });
    return () => { cancelled = true; };
  }, [range, group, productId]);

  const totals = useMemo(() => ({
    good: rows?.reduce((s, r) => s + r.good, 0) ?? 0,
    wasted: rows?.reduce((s, r) => s + r.wasted, 0) ?? 0,
    jobs: rows?.reduce((s, r) => s + r.jobs, 0) ?? 0,
    lots: new Set(rows?.flatMap((r) => r.lots)).size,
  }), [rows]);
  const activeQuick = range && RANGES.find((q) => {
    const r = q.make(new Date());
    return r.from === range.from && r.to === range.to;
  })?.id;

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
    `h-10 rounded-lg border px-3 text-sm font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-[#f6f5f1]"}`;

  return (
    <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
      <PageHeader title="Reports" subtitle="labels printed" />

      <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
        {/* Filters: one row above the numbers */}
        <div className="flex flex-wrap items-end gap-3">
          <div role="radiogroup" aria-label="Group by" className="flex rounded-xl border border-line bg-page p-0.5 text-sm">
            {([["day", "Day wise"], ["month", "Month wise"]] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={group === v} onClick={() => setGroup(v)}
                className={`h-9 rounded-lg px-3.5 font-semibold transition ${group === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((q) => (
              <button key={q.id} type="button" onClick={() => setRange(q.make(new Date()))} className={chip(activeQuick === q.id)}>
                {q.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            {(["from", "to"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1 text-xs font-semibold text-muted">
                {k === "from" ? "From" : "To"}
                <input type="date" value={range?.[k] ?? ""} required
                  onChange={(e) => e.target.value && setRange((r) => ({ ...(r ?? { from: "", to: "" }), [k]: e.target.value }))}
                  className="h-10 rounded-lg border border-line bg-white px-2.5 text-sm font-normal text-ink outline-none focus:border-accent" />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Product
              <select value={productId ?? ""} onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)}
                className="h-10 rounded-lg border border-line bg-white px-2 text-sm font-normal text-ink outline-none focus:border-accent">
                <option value="">All products</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <button type="button" onClick={onExport} disabled={!range || exporting}
            className="ml-auto h-10 rounded-lg border border-line bg-white px-3 text-sm font-semibold hover:bg-[#f6f5f1] disabled:opacity-45">
            {exporting ? "Preparing…" : "Download CSV"}
          </button>
        </div>

        {range && range.from > range.to && <p className="mt-3 text-sm text-err">&quot;From&quot; must be before &quot;To&quot;.</p>}
        {err && <p className="mt-3 text-sm text-err">{err}</p>}

        <dl className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {([["Good labels", totals.good], ["Wasted", totals.wasted], ["Print jobs", totals.jobs], ["Lots", totals.lots]] as const).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-page px-2 py-2.5"><dt className="text-xs text-muted">{k}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>
          ))}
        </dl>

        <div className="mt-2"><MonthCompare productId={productId} /></div>

        {rows && range && range.from <= range.to && (
          <div className={`mt-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
            <GoodChart rows={rows} range={range} group={group} />
          </div>
        )}

        <div className={`mt-4 overflow-x-auto rounded-xl border border-line transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-page text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{group === "month" ? "Month" : "Day"}</th>
                <th className="px-3 py-2.5 font-semibold">Lots</th>
                <th className="px-3 py-2.5 font-semibold">By product (good)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Jobs</th>
                <th className="px-3 py-2.5 text-right font-semibold">Wasted</th>
                <th className="px-3 py-2.5 text-right font-semibold">Good labels</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.period} className="border-t border-line align-top">
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{periodLabel(r.period, group)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {group === "month" ? `${r.lots.length} lot${r.lots.length === 1 ? "" : "s"}` : r.lots.join(", ")}
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {Object.entries(r.products).map(([name, n]) => `${name} ${n}`).join(" · ")}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.jobs}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.wasted || ""}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.good}</td>
                </tr>
              ))}
              {rows?.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No labels printed in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Counts only prints that finished. Good = printed − wasted. Days follow the lot day (Spain time).</p>
      </section>
    </div>
  );
}
