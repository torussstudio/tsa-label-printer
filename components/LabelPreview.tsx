"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { LABEL_H, LABEL_W, drawLabel, ensureFont, type LabelTemplate, type PrintData } from "@/lib/label";

export interface LabelPreviewHandle {
  /** Renders a fresh label (with the current date) onto an offscreen canvas for printing. */
  renderForPrint: () => Promise<HTMLCanvasElement>;
}

interface Props {
  tpl: LabelTemplate;
  data: PrintData;
  now: Date | null;
}

export const LabelPreview = forwardRef<LabelPreviewHandle, Props>(function LabelPreview({ tpl, data, now }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!now) return;
    let cancelled = false;
    Promise.all([ensureFont(tpl.font), ensureFont(tpl.labelFont)]).then(() => {
      if (!cancelled && canvasRef.current) drawLabel(canvasRef.current, tpl, data, now);
    });
    return () => { cancelled = true; };
  }, [tpl, data, now]);

  useImperativeHandle(ref, () => ({
    renderForPrint: async () => {
      await Promise.all([ensureFont(tpl.font), ensureFont(tpl.labelFont)]);
      const at = new Date();
      const c = document.createElement("canvas");
      c.width = LABEL_W;
      c.height = LABEL_H;
      drawLabel(c, tpl, data, at);
      if (canvasRef.current) drawLabel(canvasRef.current, tpl, data, at);
      return c;
    },
  }), [tpl, data]);

  // Transparent labels: show the print over a pink "bottle" so it reads like the real thing
  const bg = tpl.paper === "transparent"
    ? "bg-gradient-to-b from-[#f6b3b0] via-[#f58a7a] to-[#ef5a45]"
    : "bg-[repeating-conic-gradient(#eeece6_0%_25%,#f7f6f2_0%_50%)] bg-[length:16px_16px]";

  return (
    <div className={`grid place-items-center rounded-xl p-5 ${bg}`}>
      <canvas
        ref={canvasRef}
        width={LABEL_W}
        height={LABEL_H}
        className={`aspect-[4/3] w-full max-w-[340px] rounded-md [image-rendering:pixelated] ${
          tpl.paper === "transparent"
            ? "mix-blend-multiply opacity-80 outline outline-1 outline-white/50"
            : "bg-white shadow-[0_1px_2px_rgba(0,0,0,.08),0_6px_20px_rgba(0,0,0,.08)]"
        }`}
        aria-label="Label preview"
      />
    </div>
  );
});
