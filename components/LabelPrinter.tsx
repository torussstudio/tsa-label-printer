"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LabelPreview, type LabelPreviewHandle } from "@/components/LabelPreview";
import { TemplateForm } from "@/components/TemplateForm";
import { useNow, useTemplate } from "@/hooks/useTemplate";
import { DEFAULT_CALIBRATION, HEAD_DOTS, buildLot, expiryDate, formatDate, getPreset } from "@/lib/label";
import { connectPrinter, isWebBluetoothSupported, printCanvas, type PrinterClient } from "@/lib/printer";

type Msg = { text: string; tone?: "ok" | "err" } | null;
type Conn = "idle" | "connecting" | "connected";

const MAX_QTY = 999;

export function LabelPrinter() {
  const { tpl, update } = useTemplate();
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
      const text = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(text)) setMsg({ text: `Couldn't connect: ${text}`, tone: "err" });
    }
  }, [conn]);

  const onPrint = useCallback(async () => {
    const client = clientRef.current;
    const preview = previewRef.current;
    if (!client || !preview || printing) return;
    const n = clamp(qty);
    setPrinting(true);
    setProgress(0);
    setMsg({ text: `Printing ${n} label${n > 1 ? "s" : ""}…` });
    try {
      // Fresh render at the moment of printing, so the date and the lot code are made from this exact moment
      await printCanvas(client, await preview.renderForPrint(headDots()), n, tpl.density, preset.paper);
      setProgress(100);
      setMsg({ text: `Done · ${n} label${n > 1 ? "s" : ""} printed`, tone: "ok" });
    } catch (e) {
      setMsg({ text: `Print failed: ${e instanceof Error ? e.message : String(e)}`, tone: "err" });
    } finally {
      setPrinting(false);
      setTimeout(() => setProgress(null), 1500);
    }
  }, [printing, qty, tpl.density, preset.paper]);

  const onAlignmentTest = useCallback(async () => {
    const client = clientRef.current;
    const preview = previewRef.current;
    if (!client || !preview || printing) return;
    setPrinting(true);
    setMsg({ text: "Printing alignment test…" });
    try {
      await printCanvas(client, preview.renderAlignmentTest(headDots()), 1, tpl.density, preset.paper);
      setMsg({ text: "Test printed. If the frame isn't even on all sides, adjust the alignment below and test again.", tone: "ok" });
    } catch (e) {
      setMsg({ text: `Print failed: ${e instanceof Error ? e.message : String(e)}`, tone: "err" });
    } finally {
      setPrinting(false);
    }
  }, [printing, tpl.density, preset.paper]);

  const dotCls = conn === "connected" ? "bg-ok" : conn === "connecting" ? "bg-warn" : "bg-neutral-400";
  const statusText =
    conn === "connected" ? `Connected${model ? ` · ${model}` : ""}` : conn === "connecting" ? "Connecting…" : "Not connected";

  return (
    <div className="mx-auto w-full max-w-[1100px] pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-16 lg:px-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-0">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          Lot Label <span className="font-medium text-muted">· The Spanish Alchemist · Nimbot B1 {preset.wMm}×{preset.hMm}</span>
        </h1>
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <span className={`size-2.5 rounded-full ${dotCls}`} />
          {statusText}
        </span>
      </header>

      {!supported && (
        <div className="mx-4 mb-4 rounded-xl border border-[#f1d3a1] bg-[#fff4e0] px-3 py-2.5 text-sm text-[#6d4300] sm:mx-0">
          This browser doesn&apos;t support Web Bluetooth. Use Chrome or Edge on Android, Windows, Mac or Linux, and open
          this page over HTTPS. iPhone/Safari won&apos;t work.
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="self-start border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
          <h2 className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-muted">Print</h2>
          <LabelPreview ref={previewRef} tpl={tpl} now={now} />

          {now && (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">Made</dt><dd className="font-semibold">{formatDate(now, tpl.format)}</dd></div>
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">Expires</dt><dd className="font-semibold">{formatDate(expiryDate(now), tpl.format)}</dd></div>
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">Lot</dt><dd className="font-semibold">{buildLot(tpl, now)}</dd></div>
            </dl>
          )}
          <p className="mt-2 text-center text-xs text-muted">The lot code is made from the exact print time, so it changes on every print.</p>

          <div className="mt-4 flex flex-wrap gap-3">
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
            <button type="button" disabled={conn !== "connected" || printing} onClick={onPrint}
              className="h-13 min-w-40 flex-1 rounded-xl bg-accent text-lg font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
              {printing ? "Printing…" : "Print"}
            </button>
          </div>

          <button type="button" onClick={onConnect} disabled={!supported || printing || conn === "connecting"}
            className="mt-2.5 h-13 w-full rounded-xl border border-line bg-white font-semibold hover:bg-[#f6f5f1] disabled:cursor-not-allowed disabled:opacity-45">
            {conn === "connected" ? "Disconnect" : conn === "connecting" ? "Connecting…" : "Connect printer"}
          </button>

          {progress !== null && (
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-[#eceae4]">
              <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          )}
          <details className="group mt-4 rounded-xl border border-line bg-page/60 px-3.5 py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              Printer alignment
              <span className="text-xs font-normal text-muted">
                {preset.paper === "transparent" ? "Transparent" : "White sticker"} · {cal.x > 0 ? "+" : ""}{cal.x} / {cal.y > 0 ? "+" : ""}{cal.y} mm
              </span>
            </summary>
            <p className="mt-2 text-xs text-muted">
              Print the test once. The frame should be the same distance from every edge of the sticker.
              If it isn&apos;t, move it here and test again. Saved per paper type.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([["x", "Left / right", "←", "→"], ["y", "Up / down", "↑", "↓"]] as const).map(([axis, label, minus, plus]) => (
                <div key={axis} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-2 py-1.5">
                  <span className="text-xs font-semibold text-muted">{label}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`${label} minus`} onClick={() => setCal(axis, cal[axis] - 0.5)}
                      className="size-8 rounded-md bg-page text-base hover:bg-[#eeece6]">{minus}</button>
                    <span className="w-16 whitespace-nowrap text-center text-sm font-semibold tabular-nums">{cal[axis] > 0 ? "+" : ""}{cal[axis]} mm</span>
                    <button type="button" aria-label={`${label} plus`} onClick={() => setCal(axis, cal[axis] + 0.5)}
                      className="size-8 rounded-md bg-page text-base hover:bg-[#eeece6]">{plus}</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex gap-2">
              <button type="button" onClick={onAlignmentTest} disabled={conn !== "connected" || printing}
                className="h-10 flex-1 rounded-lg border border-line bg-white text-sm font-semibold hover:bg-[#f6f5f1] disabled:cursor-not-allowed disabled:opacity-45">
                Print alignment test
              </button>
              <button type="button" onClick={() => update("calibration", { ...calibration, [preset.paper]: { x: 0, y: 0 } })}
                className="h-10 rounded-lg px-3 text-sm text-muted hover:text-ink">
                Reset
              </button>
            </div>
          </details>

          {msg && <p className={`mt-2.5 text-sm ${msg?.tone === "err" ? "text-err" : msg?.tone === "ok" ? "text-ok" : ""}`}>
            {msg.text}
          </p>}
        </section>

        <TemplateForm tpl={tpl} update={update} />
      </div>
    </div>
  );
}