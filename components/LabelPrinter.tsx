"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignmentDialog } from "@/components/AlignmentDialog";
import { LabelPreview, type LabelPreviewHandle } from "@/components/LabelPreview";
import { PageHeader } from "@/components/Nav";
import { TemplateForm } from "@/components/TemplateForm";
import { TodayPrints } from "@/components/TodayPrints";
import { useNow, usePrintSettings, useTemplate, type QuickJob } from "@/hooks/useTemplate";
import {
  errorText, fetchDayLot, fetchPrints, fetchProducts, finishPrint, startPrint,
  type Lot, type PrintJob, type Product,
} from "@/lib/api";
import {
  DEFAULT_CALIBRATION, HEAD_DOTS, MAX_QTY, buildLot, expiryDate, formatDate, getPreset, parseDay, presetForProduct, toDay,
  type LabelData, type LabelTemplate,
} from "@/lib/label";
import { connectPrinter, isWebBluetoothSupported, printCanvas, type PrinterClient } from "@/lib/printer";

type Msg = { text: string; tone?: "ok" | "err" } | null;
type Conn = "idle" | "connecting" | "connected";

const MAX_QUICK_JOBS = 8;
const shelfOf = (p: Product) => ({ months: p.shelfMonths, days: p.shelfDays });

export function LabelPrinter() {
  // Template (incl. printer alignment) and print choices live in the database, shared by every device
  const { tpl, update, loaded: tplLoaded, error: tplErr } = useTemplate();
  const { settings, update: updateSettings, error: settingsErr } = usePrintSettings();
  const [alignOpen, setAlignOpen] = useState(false);
  const now = useNow();
  const previewRef = useRef<LabelPreviewHandle>(null);
  const preset = getPreset(tpl.preset);

  const clientRef = useRef<PrinterClient | null>(null);
  const [conn, setConn] = useState<Conn>("idle");
  const [model, setModel] = useState<string>();
  const [printing, setPrinting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<Msg>(null);
  const [supported, setSupported] = useState(true);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection is client-only
  useEffect(() => setSupported(isWebBluetoothSupported()), []);

  // Bumped after every print or edit, so the lot and today's list reload
  const [rev, setRev] = useState(0);
  const refresh = useCallback(() => setRev((r) => r + 1), []);

  // Products from the database; the selected one is saved in the print settings
  const [products, setProducts] = useState<Product[] | null>(null);
  const [dbErr, setDbErr] = useState<string | null>(null);
  useEffect(() => {
    fetchProducts().then(setProducts, (e) => setDbErr(errorText(e)));
  }, []);
  const activeProducts = useMemo(() => products?.filter((p) => p.active) ?? [], [products]);
  const product = activeProducts.find((p) => p.id === settings.productId) ?? activeProducts[0] ?? null;

  // Picking a label type also picks its product, by name: "Serum box" → Serum, "Cream box" → Cream.
  // A label type with no product of that name (Bottle fits every product) keeps the current product.
  const updateTemplate = useCallback(<K extends keyof LabelTemplate>(key: K, value: LabelTemplate[K]) => {
    update(key, value);
    if (key !== "preset") return;
    const match = activeProducts.find((p) => presetForProduct(p.name)?.id === value);
    if (match) updateSettings("productId", match.id);
  }, [update, updateSettings, activeProducts]);

  // Labels are always for today's lot (the server's day, Spain time, once it has answered)
  const clientDay = now ? toDay(now) : null;
  const [serverDay, setServerDay] = useState<string | null>(null);
  const today = serverDay ?? clientDay;
  const lotDate = today;

  // The selected product's lot for that day (null until that day's first print makes it)
  const [lot, setLot] = useState<Lot | null>(null);
  useEffect(() => {
    if (!product || !lotDate || !clientDay) return;
    let cancelled = false;
    fetchDayLot(product.id, lotDate)
      .then((r) => { if (!cancelled) { setLot(r.lot); setServerDay(r.today); setDbErr(null); } })
      .catch((e) => { if (!cancelled) setDbErr(errorText(e)); });
    return () => { cancelled = true; };
  }, [product, lotDate, clientDay, rev]);
  const shownLot = lot && product && lot.productId === product.id && lot.date === lotDate ? lot : null;

  // Today's print jobs, from every device
  const [history, setHistory] = useState<PrintJob[] | null>(null);
  const [historyErr, setHistoryErr] = useState<string | null>(null);
  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    fetchPrints(today, today, "printed")
      .then((r) => { if (!cancelled) { setHistory(r); setHistoryErr(null); } })
      .catch((e) => { if (!cancelled) setHistoryErr(errorText(e)); });
    return () => { cancelled = true; };
  }, [today, rev]);

  // Preview: memoized on plain values so it only redraws when something on the label changes
  const shelfMonths = product?.shelfMonths, shelfDays = product?.shelfDays;
  const previewCode = shownLot?.code ?? null;
  const preview = useMemo<LabelData | null>(() => lotDate ? {
    made: parseDay(lotDate),
    lotCode: previewCode,
    shelf: shelfMonths === undefined || shelfDays === undefined ? undefined : { months: shelfMonths, days: shelfDays },
  } : null, [lotDate, previewCode, shelfMonths, shelfDays]);

  // Daily target progress for the selected product (labels of today's lot)
  const printedToday = (history ?? [])
    .filter((j) => j.status === "printed" && j.productId === product?.id && j.lotDate === today)
    .reduce((s, j) => s + j.quantity, 0);

  // Printer alignment for the paper of the selected label type (mm)
  const calibration = tpl.calibration ?? DEFAULT_CALIBRATION;
  const cal = calibration[preset.paper] ?? { x: 0, y: 0 };
  const setCal = (axis: "x" | "y", v: number) => {
    const next = Math.round(Math.max(-8, Math.min(8, v)) * 2) / 2; // 0.5 mm steps, ±8 mm
    update("calibration", { ...calibration, [preset.paper]: { ...cal, [axis]: next } });
  };
  /** Printhead width reported by the connected printer (B1 = 384 dots). */
  const headDots = () => clientRef.current?.getModelMetadata()?.printheadPixels ?? HEAD_DOTS;

  const clamp = (v: number) => Math.min(MAX_QTY, Math.max(1, Number.isFinite(v) ? Math.floor(v) : 1));

  // What still blocks printing, in words (null = ready)
  const blocker = !tplLoaded ? "Loading the saved label settings…"
    : !product ? "Pick a product"
    : null;

  const onConnect = useCallback(async () => {
    if (conn === "connected") {
      try { await clientRef.current?.disconnect(); } catch { /* ignore */ }
      return;
    }
    setConn("connecting");
    setMsg(null);
    try {
      const { client, model } = await connectPrinter({
        onDisconnect: () => { clientRef.current = null; setConn("idle"); setModel(undefined); },
        onProgress: (p) => setProgress(p),
      });
      clientRef.current = client;
      setModel(model);
      setConn("connected");
    } catch (e) {
      setConn("idle");
      const text = errorText(e);
      if (!/cancel/i.test(text)) setMsg({ text: `Couldn't connect: ${text}`, tone: "err" });
    }
  }, [conn]);

  const onPrint = useCallback(async () => {
    const client = clientRef.current;
    const previewEl = previewRef.current;
    if (!client || !previewEl || printing || !product || blocker) return;
    const n = clamp(qty);
    const labels = `${n} label${n > 1 ? "s" : ""}`;
    setPrinting(true);
    setProgress(0);
    setMsg({ text: `Printing ${labels}…` });
    let jobId: number | null = null;
    try {
      // Record the job first: the server answers with the lot to print (made now if it's the day's first)
      const job = await startPrint(tpl, { productId: product.id, quantity: n, date: null, note: "" });
      jobId = job.id;
      setLot(job.lot);
      const data = { made: parseDay(job.lot.date), lotCode: job.lot.code, shelf: shelfOf(job.product) };
      await printCanvas(client, await previewEl.renderForPrint(data, headDots()), n, tpl.density, preset.paper);
      setProgress(100);
    } catch (e) {
      if (jobId !== null) finishPrint(jobId, "failed").catch(() => { /* stays "pending", not counted */ });
      setMsg({ text: `Print failed: ${errorText(e)}`, tone: "err" });
      setPrinting(false);
      setTimeout(() => setProgress(null), 1500);
      refresh();
      return;
    }
    try {
      await finishPrint(jobId, "printed");
      setMsg({ text: `Done · ${labels} printed`, tone: "ok" });
    } catch (e) {
      setMsg({ text: `${labels} printed, but not saved to the count: ${errorText(e)}`, tone: "err" });
    } finally {
      setPrinting(false);
      setTimeout(() => setProgress(null), 1500);
      refresh();
    }
  }, [printing, qty, tpl, preset.paper, product, blocker, refresh]);

  const onAlignmentTest = useCallback(async () => {
    const client = clientRef.current;
    const previewEl = previewRef.current;
    if (!client || !previewEl || printing || !tplLoaded) return;
    setPrinting(true);
    setMsg({ text: "Printing alignment test…" });
    try {
      await printCanvas(client, previewEl.renderAlignmentTest(headDots()), 1, tpl.density, preset.paper);
      setMsg({ text: "Test printed. If the frame isn't even on all sides, move it with the arrows and test again.", tone: "ok" });
    } catch (e) {
      setMsg({ text: `Print failed: ${errorText(e)}`, tone: "err" });
    } finally {
      setPrinting(false);
    }
  }, [printing, tplLoaded, tpl.density, preset.paper]);

  // Quick jobs: saved product + label type + quantity, set up with one tap
  const quickName = (q: QuickJob) =>
    `${products?.find((p) => p.id === q.productId)?.name ?? "?"} · ${getPreset(q.preset).name} · ×${q.qty}`;
  const applyQuick = (q: QuickJob) => {
    updateSettings("productId", q.productId);
    update("preset", q.preset);
    setQty(q.qty);
  };
  const saveQuick = () => {
    if (!product) return;
    const q: QuickJob = { id: `${product.id}-${tpl.preset}-${clamp(qty)}`, productId: product.id, preset: tpl.preset, qty: clamp(qty) };
    if (settings.quickJobs.some((x) => x.id === q.id)) return;
    updateSettings("quickJobs", [...settings.quickJobs, q].slice(-MAX_QUICK_JOBS));
  };
  const quickActive = (q: QuickJob) => q.productId === product?.id && q.preset === tpl.preset && q.qty === clamp(qty);

  const dotCls = conn === "connected" ? "bg-ok" : conn === "connecting" ? "bg-warn" : "bg-neutral-400";
  const statusText =
    conn === "connected" ? `Connected${model ? ` · ${model}` : ""}` : conn === "connecting" ? "Connecting…" : "Not connected";
  const chip = (on: boolean) =>
    `rounded-lg border px-3 text-sm font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-[#f6f5f1]"}`;

  return (
    <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
      <PageHeader title="Lot Label" subtitle={`The Spanish Alchemist · Nimbot B1 ${preset.wMm}×${preset.hMm}`}>
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <span className={`size-2.5 rounded-full ${dotCls}`} />
          {statusText}
        </span>
      </PageHeader>

      {!supported && (
        <div className="mx-4 mb-4 rounded-xl border border-[#f1d3a1] bg-[#fff4e0] px-3 py-2.5 text-sm text-[#6d4300] sm:mx-0">
          This browser doesn&apos;t support Web Bluetooth. Use Chrome or Edge on Android, Windows, Mac or Linux, and open
          this page over HTTPS. iPhone/Safari won&apos;t work.
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3 self-start sm:gap-4">
        <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
          <h2 className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-muted">Print</h2>

          {/* Product: each product has its own lot per day and its own shelf life */}
          <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Product">
            {activeProducts.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={p.id === product?.id}
                onClick={() => updateSettings("productId", p.id)} className={`h-10 ${chip(p.id === product?.id)}`}>
                {p.name}
              </button>
            ))}
            {products && activeProducts.length === 0 && (
              <p className="text-sm text-muted">No products yet. <Link href="/products" className="font-semibold text-accent hover:underline">Add one</Link></p>
            )}
          </div>

          <LabelPreview ref={previewRef} tpl={tpl} data={preview} />

          {preview && (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">Made</dt><dd className="font-semibold">{formatDate(preview.made, tpl.format)}</dd></div>
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">Expires</dt><dd className="font-semibold">{formatDate(expiryDate(preview.made, preview.shelf), tpl.format)}</dd></div>
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">Lot</dt><dd className="font-semibold">{buildLot(tpl, preview.made, preview.lotCode)}</dd></div>
            </dl>
          )}
          {dbErr
            ? <p className="mt-2 text-center text-xs text-err">Database: {dbErr}. Printing needs the database to get the lot.</p>
            : product && <p className="mt-2 text-center text-xs text-muted">
              {shownLot
                ? `Every ${product.name} print today, on any device, uses this lot.`
                : `New ${product.name} lot: it's made by the first print today.`}
            </p>}
          {(tplErr || settingsErr) && <p className="mt-1 text-center text-xs text-err">{tplErr ?? settingsErr}</p>}

          {product?.dailyTarget && (
            <div className="mt-3 rounded-lg bg-page px-3 py-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold">Today&apos;s target · {product.name}</span>
                <span className="tabular-nums text-muted"><span className="font-semibold text-ink">{printedToday}</span> / {product.dailyTarget}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e4e2dc]">
                <div className={`h-full ${printedToday >= product.dailyTarget ? "bg-ok" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, (printedToday / product.dailyTarget) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Quick jobs */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {settings.quickJobs.map((q) => (
              <span key={q.id} className={`inline-flex h-9 items-center overflow-hidden ${chip(quickActive(q))} px-0`}>
                <button type="button" onClick={() => applyQuick(q)} className="h-full pl-3 pr-1.5">{quickName(q)}</button>
                <button type="button" aria-label={`Remove ${quickName(q)}`} onClick={() => updateSettings("quickJobs", settings.quickJobs.filter((x) => x.id !== q.id))}
                  className="h-full px-2 opacity-50 hover:opacity-100">×</button>
              </span>
            ))}
            <button type="button" onClick={saveQuick} disabled={!product}
              title="Save this product, label type and quantity as a quick button"
              className="h-9 rounded-lg border border-dashed border-line px-3 text-sm text-muted hover:text-ink disabled:opacity-45">
              + Save as quick job
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center overflow-hidden rounded-xl border border-line">
              <button type="button" aria-label="Decrease" className="h-13 w-12 bg-[#f6f5f1] text-2xl hover:bg-[#eeece6]"
                onClick={() => setQty((q) => clamp(q - 1))}>−</button>
              <input type="number" inputMode="numeric" min={1} max={MAX_QTY} value={qty}
                aria-label="Quantity"
                className="h-13 w-16 border-0 text-center text-xl font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                onChange={(e) => setQty(Number(e.target.value) || 1)}
                onBlur={() => setQty((q) => clamp(q))} />
              <button type="button" aria-label="Increase" className="h-13 w-12 bg-[#f6f5f1] text-2xl hover:bg-[#eeece6]"
                onClick={() => setQty((q) => clamp(q + 1))}>+</button>
            </div>
            <button type="button" disabled={conn !== "connected" || printing || !!blocker} onClick={onPrint}
              title={blocker ?? undefined}
              className="h-13 min-w-40 flex-1 rounded-xl bg-accent text-lg font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
              {printing ? "Printing…" : "Print"}
            </button>
          </div>
          {blocker && conn === "connected" && <p className="mt-1.5 text-xs text-muted">{blocker}</p>}

          <div className="mt-2.5 flex gap-2.5">
            <button type="button" onClick={onConnect} disabled={!supported || printing || conn === "connecting"}
              className="h-13 flex-1 rounded-xl border border-line bg-white font-semibold hover:bg-[#f6f5f1] disabled:cursor-not-allowed disabled:opacity-45">
              {conn === "connected" ? "Disconnect" : conn === "connecting" ? "Connecting…" : "Connect printer"}
            </button>
            <button type="button" onClick={() => setAlignOpen(true)} disabled={!tplLoaded}
              className="flex h-13 flex-col items-center justify-center rounded-xl border border-line bg-white px-4 leading-tight hover:bg-[#f6f5f1] disabled:cursor-not-allowed disabled:opacity-45">
              <span className="font-semibold">Alignment</span>
              <span className="text-[11px] text-muted tabular-nums">{cal.x > 0 ? "+" : ""}{cal.x} / {cal.y > 0 ? "+" : ""}{cal.y} mm</span>
            </button>
          </div>

          {progress !== null && (
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-[#eceae4]">
              <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          )}
          <AlignmentDialog
            open={alignOpen}
            onClose={() => setAlignOpen(false)}
            paperName={preset.paper === "transparent" ? "Transparent sticker" : "White sticker"}
            cal={cal}
            onMove={(axis, d) => setCal(axis, cal[axis] + d)}
            onReset={() => update("calibration", { ...calibration, [preset.paper]: { x: 0, y: 0 } })}
            onTest={onAlignmentTest}
            canTest={conn === "connected" && !printing}
            testHint={conn !== "connected" ? "Connect the printer first." : null}
            message={msg}
          />

          {msg && <p className={`mt-2.5 text-sm ${msg?.tone === "err" ? "text-err" : msg?.tone === "ok" ? "text-ok" : ""}`}>
            {msg.text}
          </p>}
        </section>

        <TodayPrints jobs={history} error={historyErr} />
        </div>

        <TemplateForm tpl={tpl} update={updateTemplate} />
      </div>
    </div>
  );
}
