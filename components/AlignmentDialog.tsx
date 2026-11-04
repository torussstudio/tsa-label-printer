"use client";

import { useEffect, useRef } from "react";
import { showToast } from "@/components/Toast";

type Axis = "x" | "y";

interface Props {
  open: boolean;
  onClose: () => void;
  paperName: string;              // "White sticker" / "Transparent"
  cal: { x: number; y: number };  // current offset for this paper, mm
  onMove: (axis: Axis, deltaMm: number) => void;
  onReset: () => void;
  onTest: () => void;
  canTest: boolean;               // printer connected and idle
  testHint: string | null;        // why the test can't print right now
  message: { text: string; tone?: "ok" | "err" } | null;
}

const fmt = (v: number) => `${v > 0 ? "+" : ""}${v} mm`;

/** Printer alignment: print a test frame, then nudge the print with arrow buttons (0.5 mm per press). */
export function AlignmentDialog({ open, onClose, paperName, cal, onMove, onReset, onTest, canTest, testHint, message }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (message?.tone === "ok") showToast("success", message.text);
    if (message?.tone === "err") showToast("error", message.text);
  }, [message]);

  const arrow = (axis: Axis, delta: number, label: string, symbol: string) => (
    <button type="button" aria-label={label} onClick={() => onMove(axis, delta)}
      className="grid size-14 place-items-center rounded-xl border border-line bg-white text-2xl font-semibold shadow-sm transition hover:bg-[#f6f5f1] active:scale-95">
      {symbol}
    </button>
  );

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-black/40">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Printer alignment</h2>
            <p className="text-xs text-muted">{paperName} · saved for every device</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="size-8 rounded-lg text-xl text-muted hover:bg-page hover:text-ink">×</button>
        </div>

        <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-muted">
          <li>Print the test frame.</li>
          <li>The frame should be the same distance from every edge of the sticker.</li>
          <li>If it isn&apos;t, move it with the arrows and print the test again.</li>
        </ol>

        {/* Arrow pad: up/down moves along the sticker, left/right across it */}
        <div className="mt-4 grid grid-cols-3 place-items-center gap-2">
          <span />
          {arrow("y", -0.5, "Move up", "↑")}
          <span />
          {arrow("x", -0.5, "Move left", "←")}
          <div className="text-center text-xs tabular-nums">
            <p><span className="text-muted">↔</span> <span className="font-semibold">{fmt(cal.x)}</span></p>
            <p><span className="text-muted">↕</span> <span className="font-semibold">{fmt(cal.y)}</span></p>
          </div>
          {arrow("x", 0.5, "Move right", "→")}
          <span />
          {arrow("y", 0.5, "Move down", "↓")}
          <span />
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onTest} disabled={!canTest}
            className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
            Print test frame
          </button>
          <button type="button" onClick={onReset} className="h-11 rounded-xl border border-line px-4 text-sm font-semibold hover:bg-[#f6f5f1]">
            Reset
          </button>
        </div>
        {!canTest && testHint && <p className="mt-1.5 text-xs text-muted">{testHint}</p>}
      </div>
    </dialog>
  );
}
