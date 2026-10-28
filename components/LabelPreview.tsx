"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { DOTS_PER_MM, FEED_SHIFT_DOTS, drawLabel, ensureFont, fontsFor, getPreset, type LabelTemplate } from "@/lib/label";

/** Loads every web font the current design uses before drawing. */
const loadFonts = (tpl: LabelTemplate) => Promise.all(Object.values(fontsFor(tpl)).map(ensureFont));

export interface LabelPreviewHandle {
  /** Renders a fresh label (with the current date and lot) onto an offscreen canvas for printing. */
  renderForPrint: () => Promise<HTMLCanvasElement>;
}

interface Props {
  tpl: LabelTemplate;
  now: Date | null;
}

export const LabelPreview = forwardRef<LabelPreviewHandle, Props>(function LabelPreview({ tpl, now }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas = the PAPER size of the selected preset. The design is centred inside it by drawLabel.
  const preset = getPreset(tpl.preset);
  const pw = preset.paperWMm * DOTS_PER_MM;
  const ph = preset.paperHMm * DOTS_PER_MM;

  useEffect(() => {
    if (!now) return;
    let cancelled = false;
    loadFonts(tpl).then(() => {
      if (!cancelled && canvasRef.current) drawLabel(canvasRef.current, tpl, now, { guide: true });
    });
    return () => { cancelled = true; };
  }, [tpl, now, pw, ph]);

  useImperativeHandle(ref, () => ({
    renderForPrint: async () => {
      await loadFonts(tpl);
      const at = new Date(); // the lot code is made from this exact moment
      const c = document.createElement("canvas");
      c.width = pw;
      c.height = ph;
      // no guide outline on the printed canvas; shift compensates the printer's start offset
      drawLabel(c, tpl, at, { shiftX: FEED_SHIFT_DOTS[preset.paper] });
      if (canvasRef.current) drawLabel(canvasRef.current, tpl, at, { guide: true });
      return c;
    },
  }), [tpl, pw, ph, preset.paper]);

  return (
    <div className="grid place-items-center rounded-xl bg-[repeating-conic-gradient(#eeece6_0%_25%,#f7f6f2_0%_50%)] bg-[length:16px_16px] p-3 sm:p-5">
      <canvas
        // key: a new canvas element when the size changes, so the browser resets it cleanly
        key={preset.id}
        ref={canvasRef}
        width={pw}
        height={ph}
        style={{ aspectRatio: `${pw} / ${ph}` }}
        className="w-full max-w-[380px] rounded-md bg-white [image-rendering:pixelated] shadow-[0_1px_2px_rgba(0,0,0,.08),0_6px_20px_rgba(0,0,0,.08)]"
        aria-label="Label preview"
      />
    </div>
  );
});