// "use client";

// import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
// import {
//   DEFAULT_CALIBRATION,
//   DOTS_PER_MM,
//   HEAD_DOTS,
//   composeForPrinter,
//   drawAlignmentTest,
//   drawLabel,
//   ensureFont,
//   fontsFor,
//   getPreset,
//   type LabelTemplate,
// } from "@/lib/label";

// /** Loads every web font the current design uses before drawing. */
// const loadFonts = (tpl: LabelTemplate) => Promise.all(Object.values(fontsFor(tpl)).map(ensureFont));

// /**
//  * Preview mode:
//  * - "smooth": drawn at SMOOTH_RES × the printer resolution with soft edges. Looks like the design file.
//  * - "print":  exactly the printer image (8 dots/mm, black/white only). Use it to spot lines that would break.
//  * The printed label is the same in both modes.
//  */
// type ViewMode = "smooth" | "print";
// const SMOOTH_RES = 4;
// const VIEW_KEY = "tsa-label-preview-view";

// export interface LabelPreviewHandle {
//   /**
//    * Renders a fresh label (with the current date and lot) and returns the image to SEND to the printer:
//    * full printhead width, sticker centred, calibration applied.
//    */
//   renderForPrint: (headDots?: number) => Promise<HTMLCanvasElement>;
//   /** Alignment test image for the current paper, ready to send to the printer. */
//   renderAlignmentTest: (headDots?: number) => HTMLCanvasElement;
// }

// interface Props {
//   tpl: LabelTemplate;
//   now: Date | null;
// }

// export const LabelPreview = forwardRef<LabelPreviewHandle, Props>(function LabelPreview({ tpl, now }, ref) {
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   // Preview mode, remembered per browser (falls back to smooth if storage is unavailable)
//   const [view, setView] = useState<ViewMode>("smooth");
//   useEffect(() => {
//     try {
//       if (localStorage.getItem(VIEW_KEY) === "print") setView("print");
//     } catch { /* ignore */ }
//   }, []);
//   const changeView = (v: ViewMode) => {
//     setView(v);
//     try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
//   };
//   const smooth = view === "smooth";
//   const res = smooth ? SMOOTH_RES : 1;

//   // Paper size of the selected preset, in printer dots. The design is centred inside it by drawLabel.
//   const preset = getPreset(tpl.preset);
//   const pw = preset.paperWMm * DOTS_PER_MM;
//   const ph = preset.paperHMm * DOTS_PER_MM;
//   const cal = (tpl.calibration ?? DEFAULT_CALIBRATION)[preset.paper] ?? { x: 0, y: 0 };
//   const calX = cal.x, calY = cal.y;

//   useEffect(() => {
//     if (!now) return;
//     let cancelled = false;
//     loadFonts(tpl).then(() => {
//       if (!cancelled && canvasRef.current) drawLabel(canvasRef.current, tpl, now, { guide: true, res, smooth });
//     });
//     return () => { cancelled = true; };
//   }, [tpl, now, pw, ph, res, smooth]);

//   useImperativeHandle(ref, () => ({
//     renderForPrint: async (headDots = HEAD_DOTS) => {
//       await loadFonts(tpl);
//       const at = new Date(); // the lot code is made from this exact moment
//       // Printed image: always 1 canvas pixel per printer dot, black/white, no guide outline
//       const c = document.createElement("canvas");
//       c.width = pw;
//       c.height = ph;
//       drawLabel(c, tpl, at);
//       // Keep the on-screen preview in step with what was just printed (same date/lot)
//       if (canvasRef.current) drawLabel(canvasRef.current, tpl, at, { guide: true, res, smooth });
//       return composeForPrinter(c, { x: calX, y: calY }, headDots);
//     },
//     renderAlignmentTest: (headDots = HEAD_DOTS) => {
//       const c = document.createElement("canvas");
//       c.width = pw;
//       c.height = ph;
//       drawAlignmentTest(c);
//       return composeForPrinter(c, { x: calX, y: calY }, headDots);
//     },
//   }), [tpl, pw, ph, calX, calY, res, smooth]);

//   return (
//     <div className="relative grid place-items-center rounded-xl bg-[repeating-conic-gradient(#eeece6_0%_25%,#f7f6f2_0%_50%)] bg-[length:16px_16px] p-3 pt-12 sm:p-5 sm:pt-12">
//       <div
//         role="radiogroup"
//         aria-label="Preview mode"
//         className="absolute top-2.5 right-2.5 flex rounded-lg border border-line bg-white/90 p-0.5 text-xs shadow-sm backdrop-blur"
//       >
//         {([["smooth", "Smooth"], ["print", "Print view"]] as const).map(([v, label]) => (
//           <button
//             key={v}
//             type="button"
//             role="radio"
//             aria-checked={view === v}
//             onClick={() => changeView(v)}
//             title={v === "smooth" ? "Clean preview for the screen" : "Exactly what the printer prints (8 dots per mm)"}
//             className={`rounded-md px-2.5 py-1 font-semibold transition ${
//               view === v ? "bg-ink text-white" : "text-muted hover:text-ink"
//             }`}
//           >
//             {label}
//           </button>
//         ))}
//       </div>

//       <canvas
//         // key: a new canvas element when the size or mode changes, so the browser resets it cleanly
//         key={`${preset.id}-${view}`}
//         ref={canvasRef}
//         width={pw * res}
//         height={ph * res}
//         style={{ aspectRatio: `${pw} / ${ph}` }}
//         className={`w-full max-w-[380px] rounded-md bg-white shadow-[0_1px_2px_rgba(0,0,0,.08),0_6px_20px_rgba(0,0,0,.08)] ${
//           smooth ? "" : "[image-rendering:pixelated]"
//         }`}
//         aria-label={smooth ? "Label preview" : "Label preview, exact print pixels"}
//       />
//     </div>
//   );
// });



"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  DEFAULT_CALIBRATION,
  DOTS_PER_MM,
  HEAD_DOTS,
  composeForPrinter,
  drawAlignmentTest,
  drawLabel,
  ensureFont,
  fontsFor,
  getPreset,
  type LabelTemplate,
} from "@/lib/label";

/** Loads every web font the current design uses before drawing. */
const loadFonts = (tpl: LabelTemplate) => Promise.all(Object.values(fontsFor(tpl)).map(ensureFont));

/**
 * Preview mode:
 * - "smooth": drawn at SMOOTH_RES × the printer resolution with soft edges. Looks like the design file.
 * - "print":  exactly the printer image (8 dots/mm, black/white only). Use it to spot lines that would break.
 * The printed label is the same in both modes.
 */
type ViewMode = "smooth" | "print";
const SMOOTH_RES = 4;
const VIEW_KEY = "tsa-label-preview-view";
/** Print view is hidden for now: the preview is always smooth. Set to true to bring the toggle back. */
const SHOW_PRINT_VIEW = false;

export interface LabelPreviewHandle {
  /**
   * Renders a fresh label (with the current date and lot) and returns the image to SEND to the printer:
   * full printhead width, sticker centred, calibration applied.
   */
  renderForPrint: (headDots?: number) => Promise<HTMLCanvasElement>;
  /** Alignment test image for the current paper, ready to send to the printer. */
  renderAlignmentTest: (headDots?: number) => HTMLCanvasElement;
}

interface Props {
  tpl: LabelTemplate;
  now: Date | null;
}

export const LabelPreview = forwardRef<LabelPreviewHandle, Props>(function LabelPreview({ tpl, now }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Preview mode, remembered per browser (falls back to smooth if storage is unavailable)
  const [view, setView] = useState<ViewMode>("smooth");
  useEffect(() => {
    try {
      if (SHOW_PRINT_VIEW && localStorage.getItem(VIEW_KEY) === "print") setView("print");
    } catch { /* ignore */ }
  }, []);
  const changeView = (v: ViewMode) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };
  const smooth = !SHOW_PRINT_VIEW || view === "smooth";
  const res = smooth ? SMOOTH_RES : 1;

  // Paper size of the selected preset, in printer dots. The design is centred inside it by drawLabel.
  const preset = getPreset(tpl.preset);
  const pw = preset.paperWMm * DOTS_PER_MM;
  const ph = preset.paperHMm * DOTS_PER_MM;
  const cal = (tpl.calibration ?? DEFAULT_CALIBRATION)[preset.paper] ?? { x: 0, y: 0 };
  const calX = cal.x, calY = cal.y;

  useEffect(() => {
    if (!now) return;
    let cancelled = false;
    loadFonts(tpl).then(() => {
      if (!cancelled && canvasRef.current) drawLabel(canvasRef.current, tpl, now, { guide: true, res, smooth });
    });
    return () => { cancelled = true; };
  }, [tpl, now, pw, ph, res, smooth]);

  useImperativeHandle(ref, () => ({
    renderForPrint: async (headDots = HEAD_DOTS) => {
      await loadFonts(tpl);
      const at = new Date(); // the lot code is made from this exact moment
      // Printed image: always 1 canvas pixel per printer dot, black/white, no guide outline
      const c = document.createElement("canvas");
      c.width = pw;
      c.height = ph;
      drawLabel(c, tpl, at);
      // Keep the on-screen preview in step with what was just printed (same date/lot)
      if (canvasRef.current) drawLabel(canvasRef.current, tpl, at, { guide: true, res, smooth });
      return composeForPrinter(c, { x: calX, y: calY }, headDots);
    },
    renderAlignmentTest: (headDots = HEAD_DOTS) => {
      const c = document.createElement("canvas");
      c.width = pw;
      c.height = ph;
      drawAlignmentTest(c);
      return composeForPrinter(c, { x: calX, y: calY }, headDots);
    },
  }), [tpl, pw, ph, calX, calY, res, smooth]);

  return (
    <div className={`relative grid place-items-center rounded-xl bg-[repeating-conic-gradient(#eeece6_0%_25%,#f7f6f2_0%_50%)] bg-[length:16px_16px] p-3 sm:p-5 ${
      SHOW_PRINT_VIEW ? "pt-12 sm:pt-12" : ""
    }`}>
      {SHOW_PRINT_VIEW && <div
        role="radiogroup"
        aria-label="Preview mode"
        className="absolute top-2.5 right-2.5 flex rounded-lg border border-line bg-white/90 p-0.5 text-xs shadow-sm backdrop-blur"
      >
        {([["smooth", "Smooth"], ["print", "Print view"]] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={view === v}
            onClick={() => changeView(v)}
            title={v === "smooth" ? "Clean preview for the screen" : "Exactly what the printer prints (8 dots per mm)"}
            className={`rounded-md px-2.5 py-1 font-semibold transition ${
              view === v ? "bg-ink text-white" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>}

      <canvas
        // key: a new canvas element when the size or mode changes, so the browser resets it cleanly
        key={`${preset.id}-${view}`}
        ref={canvasRef}
        width={pw * res}
        height={ph * res}
        style={{ aspectRatio: `${pw} / ${ph}` }}
        className={`w-full max-w-[380px] rounded-md bg-white shadow-[0_1px_2px_rgba(0,0,0,.08),0_6px_20px_rgba(0,0,0,.08)] ${
          smooth ? "" : "[image-rendering:pixelated]"
        }`}
        aria-label={smooth ? "Label preview" : "Label preview, exact print pixels"}
      />
    </div>
  );
});