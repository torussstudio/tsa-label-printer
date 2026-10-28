// "use client";

// /* eslint-disable @typescript-eslint/no-unused-vars -- FONTS, FontKey, LabelPaper and Check are used by the commented-out options below */
// import { DATE_FORMATS, FONTS, PRESETS, SHELF_LIFE, getPreset, type DateFormat, type FontKey, type LabelPaper, type LabelPreset, type LabelTemplate } from "@/lib/label";

// /** Set to true to show the Fonts dropdowns again (handmade design only). */
// const SHOW_FONTS = false;

// interface Props {
//   tpl: LabelTemplate;
//   update: <K extends keyof LabelTemplate>(key: K, value: LabelTemplate[K]) => void;
// }

// export const inputCls =
//   "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-ink shadow-sm outline-none transition placeholder:text-muted/60 hover:border-neutral-300 focus:border-accent focus:ring-4 focus:ring-accent/15";

// /**
//  * Label + control. `className` defaults to "mt-3" (used by the commented-out blocks below);
//  * pass "" when the field sits inside a grid that already handles spacing.
//  */
// export function Field({
//   label,
//   htmlFor,
//   children,
//   className = "mt-3",
// }: {
//   label: React.ReactNode;
//   htmlFor?: string;
//   children: React.ReactNode;
//   className?: string;
// }) {
//   return (
//     <div className={`min-w-0 ${className}`}>
//       <label htmlFor={htmlFor} className="mb-1.5 block truncate text-xs font-semibold text-muted">{label}</label>
//       {children}
//     </div>
//   );
// }

// /** Numbered section: badge + title + short hint, then its fields. */
// function Group({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
//   return (
//     <div>
//       <div className="mb-4 flex items-start gap-3">
//         <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">{step}</span>
//         <div className="min-w-0">
//           <h3 className="text-sm font-semibold leading-6 tracking-tight">{title}</h3>
//           {hint && <p className="text-xs text-muted">{hint}</p>}
//         </div>
//       </div>
//       {children}
//     </div>
//   );
// }

// function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
//   return (
//     <label className="flex items-center gap-2 text-sm">
//       <input type="checkbox" className="size-4 accent-accent" checked={checked} onChange={(e) => onChange(e.target.checked)} />
//       <span>{children}</span>
//     </label>
//   );
// }

// /** Mini sticker drawn to the real proportions (3 cm ≈ 3rem). Full class names so Tailwind can see them. */
// const SHAPE_CLS: Record<LabelPreset["id"], string> = {
//   "serum-box": "h-12 w-12",
//   "crema-box": "h-12 w-14",
//   "cleanser-box": "h-12 w-14",
//   bottle: "h-8 w-12",
// };

// const CHECKER =
//   "bg-[repeating-conic-gradient(#e9e7e0_0%_25%,#f6f5f1_0%_50%)] bg-[length:10px_10px]";

// function PresetCard({ p, active, onSelect }: { p: LabelPreset; active: boolean; onSelect: () => void }) {
//   const transparent = p.paper === "transparent";
//   return (
//     <button
//       type="button"
//       role="radio"
//       aria-checked={active}
//       onClick={onSelect}
//       className={`group relative flex flex-col gap-3 rounded-2xl border p-3 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-accent/20 ${
//         active
//           ? "border-accent bg-accent/5 shadow-sm ring-2 ring-accent/20"
//           : "border-line bg-white hover:-translate-y-px hover:border-neutral-300 hover:shadow-sm"
//       }`}
//     >
//       <span
//         className={`absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full transition ${
//           active ? "scale-100 bg-accent text-white" : "scale-75 bg-transparent text-transparent"
//         }`}
//         aria-hidden="true"
//       >
//         <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//           <path d="m5 10.5 3.2 3.2L15 6.8" />
//         </svg>
//       </span>

//       <span className={`grid h-20 place-items-center rounded-xl ${active ? "bg-white/70" : "bg-page"}`}>
//         <span
//           className={`rounded-[5px] border shadow-sm transition ${SHAPE_CLS[p.id]} ${
//             transparent ? `border-dashed border-neutral-400 ${CHECKER}` : "border-neutral-300 bg-white"
//           }`}
//         />
//       </span>

//       <span className="block">
//         <span className="block text-sm font-semibold leading-tight">{p.name}</span>
//         <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
//           <span className="tabular-nums">{p.wMm}×{p.hMm} mm</span>
//           <span className="rounded-full bg-page px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
//             {transparent ? "Transparent" : "White"}
//           </span>
//         </span>
//       </span>
//     </button>
//   );
// }

// export function TemplateForm({ tpl, update }: Props) {
//   const activeId = getPreset(tpl.preset).id;

//   return (
//     <section className="self-start border-y border-line bg-white p-4 shadow-sm sm:rounded-3xl sm:border sm:p-6">
//       <div className="mb-6">
//         <h2 className="text-base font-semibold tracking-tight">Template</h2>
//         <p className="mt-0.5 text-xs text-muted">Pick a sticker, tweak the wording. Changes show in the preview instantly.</p>
//       </div>

//       <div className="divide-y divide-line [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
//         <Group step={1} title="Label type" hint="Size and paper of the sticker loaded in the printer">
//           <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Label type">
//             {PRESETS.map((p) => (
//               <PresetCard key={p.id} p={p} active={activeId === p.id} onSelect={() => update("preset", p.id)} />
//             ))}
//           </div>
//         </Group>

//         <Group step={2} title="Label text" hint="Captions printed on the label">
//           <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
//             <Field label="Made label" htmlFor="tMade" className="">
//               <input id="tMade" className={inputCls} value={tpl.madeLabel} onChange={(e) => update("madeLabel", e.target.value)} />
//             </Field>
//             <Field label="Expiry label" htmlFor="tExp" className="">
//               <input id="tExp" className={inputCls} value={tpl.expLabel} onChange={(e) => update("expLabel", e.target.value)} />
//             </Field>
//             <Field label="Lot label" htmlFor="tLot" className="">
//               <input id="tLot" className={inputCls} value={tpl.lotLabel} onChange={(e) => update("lotLabel", e.target.value)} />
//             </Field>
//           </div>
//         </Group>

//         {SHOW_FONTS && getPreset(tpl.preset).design === "handmade" && (
//           <Group step={3} title="Fonts">
//             <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
//               {([
//                 ["Made date", "dateFont", "tFDate"],
//                 ["Captions", "captionFont", "tFCap"],
//                 ["EXP + lot", "valueFont", "tFVal"],
//               ] as const).map(([label, key, id]) => (
//                 <Field key={key} label={label} htmlFor={id} className="">
//                   <select id={id} className={inputCls} value={tpl[key]} onChange={(e) => update(key, e.target.value as FontKey)}>
//                     {(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
//                   </select>
//                 </Field>
//               ))}
//             </div>
//           </Group>
//         )}

//         <Group step={SHOW_FONTS ? 4 : 3} title="Dates" hint="How the made and expiry dates are written">
//           <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Date format">
//             {DATE_FORMATS.map((f) => {
//               const active = tpl.format === f.value;
//               return (
//                 <button
//                   key={f.value}
//                   type="button"
//                   role="radio"
//                   aria-checked={active}
//                   onClick={() => update("format", f.value as DateFormat)}
//                   className={`h-11 rounded-xl border px-2 font-mono text-sm tabular-nums outline-none transition focus-visible:ring-4 focus-visible:ring-accent/20 ${
//                     active
//                       ? "border-accent bg-accent/5 font-semibold ring-2 ring-accent/20"
//                       : "border-line bg-white text-muted hover:border-neutral-300 hover:text-ink"
//                   }`}
//                 >
//                   {f.label}
//                 </button>
//               );
//             })}
//           </div>
//           <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-page px-3 py-1.5 text-xs text-muted">
//             <span className="size-1.5 rounded-full bg-accent" />
//             Expiry is fixed: made date + {SHELF_LIFE.months} months {SHELF_LIFE.days} days
//           </p>
//         </Group>
//       </div>

//       {/* <div className="grid grid-cols-3 gap-2.5">
//         <Field label="Lot prefix" htmlFor="tPrefix">
//           <input id="tPrefix" className={`${inputCls} uppercase`} value={tpl.lotPrefix} onChange={(e) => update("lotPrefix", e.target.value)} />
//         </Field>
//         <Field label="Value font" htmlFor="tFont">
//           <select id="tFont" className={inputCls} value={tpl.font} onChange={(e) => update("font", e.target.value as FontKey)}>
//             {(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
//           </select>
//         </Field>
//         <Field label="Caption font" htmlFor="tLabelFont">
//           <select id="tLabelFont" className={inputCls} value={tpl.labelFont} onChange={(e) => update("labelFont", e.target.value as FontKey)}>
//             {(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
//           </select>
//         </Field>
//       </div> */}

//       {/* <div className="mt-3 grid grid-cols-2 gap-2.5">
//         <Check checked={tpl.lotWithYear} onChange={(v) => update("lotWithYear", v)}>Year in lot</Check>
//         <Check checked={tpl.showIcon} onChange={(v) => update("showIcon", v)}>Hourglass icon</Check>
//       </div>

//       <div className="grid grid-cols-2 gap-2.5">
//         <Field label="Label paper" htmlFor="tPaper">
//           <select id="tPaper" className={inputCls} value={tpl.paper} onChange={(e) => update("paper", e.target.value as LabelPaper)}>
//             <option value="gaps">White sticker</option>
//             <option value="transparent">Transparent</option>
//           </select>
//         </Field>
//         <Field label={<>Print darkness: {tpl.density}</>} htmlFor="tDensity">
//           <input id="tDensity" type="range" min={1} max={5} step={1} className="h-10 w-full accent-accent"
//             value={tpl.density} onChange={(e) => update("density", Number(e.target.value))} />
//         </Field>
//       </div> */}

//       {/* <div className="grid grid-cols-2 gap-2.5">
//         <Field label={<>Nudge left/right: {tpl.offsetX}px</>} htmlFor="tOffX">
//           <input id="tOffX" type="range" min={-40} max={40} className="h-10 w-full accent-accent"
//             value={tpl.offsetX} onChange={(e) => update("offsetX", Number(e.target.value))} />
//         </Field>
//         <Field label={<>Nudge up/down: {tpl.offsetY}px</>} htmlFor="tOffY">
//           <input id="tOffY" type="range" min={-30} max={30} className="h-10 w-full accent-accent"
//             value={tpl.offsetY} onChange={(e) => update("offsetY", Number(e.target.value))} />
//         </Field>
//       </div> */}

//       {/* <div className="grid grid-cols-2 gap-2.5">
//         <Field label={<>Table size: {tpl.scale}%</>} htmlFor="tScale">
//           <input id="tScale" type="range" min={60} max={130} step={5} className="h-10 w-full accent-accent"
//             value={tpl.scale} onChange={(e) => update("scale", Number(e.target.value))} />
//         </Field>
//         <Field label="Line thickness" htmlFor="tLine">
//           <select id="tLine" className={inputCls} value={tpl.lineWidth} onChange={(e) => update("lineWidth", Number(e.target.value))}>
//             <option value={1}>Thin (1 dot, like design)</option>
//             <option value={2}>Normal (2 dots)</option>
//             <option value={3}>Bold (3 dots)</option>
//           </select>
//         </Field>
//       </div> */}

//       <p className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-xs text-muted">
//         <span className="size-1.5 rounded-full bg-ok" />
//         Saved automatically in this browser
//       </p>
//     </section>
//   );
// }


"use client";

/* eslint-disable @typescript-eslint/no-unused-vars -- FONTS, FontKey, LabelPaper and Check are used by the commented-out options below */
import { DATE_FORMATS, FONTS, PRESETS, SHELF_LIFE, getPreset, type DateFormat, type FontKey, type LabelPaper, type LabelPreset, type LabelTemplate } from "@/lib/label";

/** Set to true to show the Fonts dropdowns again (handmade design only). */
const SHOW_FONTS = false;

interface Props {
  tpl: LabelTemplate;
  update: <K extends keyof LabelTemplate>(key: K, value: LabelTemplate[K]) => void;
}

export const inputCls =
  "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-ink shadow-sm outline-none transition placeholder:text-muted/60 hover:border-neutral-300 focus:border-accent focus:ring-4 focus:ring-accent/15";

/**
 * Label + control. `className` defaults to "mt-3" (used by the commented-out blocks below);
 * pass "" when the field sits inside a grid that already handles spacing.
 */
export function Field({
  label,
  htmlFor,
  children,
  className = "mt-3",
}: {
  label: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="mb-1.5 block truncate text-xs font-semibold text-muted">{label}</label>
      {children}
    </div>
  );
}

/** Numbered section: badge + title + short hint, then its fields. */
function Group({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">{step}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-6 tracking-tight">{title}</h3>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-accent" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

const CHECKER =
  "bg-[repeating-conic-gradient(#e9e7e0_0%_25%,#f6f5f1_0%_50%)] bg-[length:10px_10px]";

/** Mini sticker drawn to the real proportions (1 mm = 0.1 rem, so 3 cm = 3 rem). */
const mmToRem = (mm: number) => `${mm / 10}rem`;

function PresetCard({ p, active, onSelect }: { p: LabelPreset; active: boolean; onSelect: () => void }) {
  const transparent = p.paper === "transparent";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`group relative flex flex-col gap-3 rounded-2xl border p-3 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-accent/20 ${
        active
          ? "border-accent bg-accent/5 shadow-sm ring-2 ring-accent/20"
          : "border-line bg-white hover:-translate-y-px hover:border-neutral-300 hover:shadow-sm"
      }`}
    >
      <span
        className={`absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full transition ${
          active ? "scale-100 bg-accent text-white" : "scale-75 bg-transparent text-transparent"
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 10.5 3.2 3.2L15 6.8" />
        </svg>
      </span>

      <span className={`grid h-20 place-items-center rounded-xl ${active ? "bg-white/70" : "bg-page"}`}>
        {/* Outer = paper (sticker), inner dashed box = design area printed on it */}
        <span
          className={`grid place-items-center rounded-[5px] border shadow-sm transition ${
            transparent ? `border-dashed border-neutral-400 ${CHECKER}` : "border-neutral-300 bg-white"
          }`}
          style={{ width: mmToRem(p.paperWMm), height: mmToRem(p.paperHMm) }}
        >
          <span
            className="rounded-[3px] border border-dashed border-accent/60 bg-accent/5"
            style={{ width: mmToRem(p.wMm), height: mmToRem(p.hMm) }}
          />
        </span>
      </span>

      <span className="block">
        <span className="block text-sm font-semibold leading-tight">{p.name}</span>
        <span className="mt-1 block text-xs text-muted">
          <span className="tabular-nums">Design {p.wMm}×{p.hMm} mm</span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
          <span className="tabular-nums">Paper {p.paperWMm}×{p.paperHMm} mm</span>
          <span className="rounded-full bg-page px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
            {transparent ? "Transparent" : "White"}
          </span>
        </span>
      </span>
    </button>
  );
}

export function TemplateForm({ tpl, update }: Props) {
  const activeId = getPreset(tpl.preset).id;

  return (
    <section className="self-start border-y border-line bg-white p-4 shadow-sm sm:rounded-3xl sm:border sm:p-6">
      <div className="mb-6">
        <h2 className="text-base font-semibold tracking-tight">Template</h2>
        <p className="mt-0.5 text-xs text-muted">Pick a sticker, tweak the wording. Changes show in the preview instantly.</p>
      </div>

      <div className="divide-y divide-line [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <Group step={1} title="Label type" hint="Paper loaded in the printer, and the design size printed on it">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Label type">
            {PRESETS.map((p) => (
              <PresetCard key={p.id} p={p} active={activeId === p.id} onSelect={() => update("preset", p.id)} />
            ))}
          </div>
        </Group>

        <Group step={2} title="Label text" hint="Captions printed on the label">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Made label" htmlFor="tMade" className="">
              <input id="tMade" className={inputCls} value={tpl.madeLabel} onChange={(e) => update("madeLabel", e.target.value)} />
            </Field>
            <Field label="Expiry label" htmlFor="tExp" className="">
              <input id="tExp" className={inputCls} value={tpl.expLabel} onChange={(e) => update("expLabel", e.target.value)} />
            </Field>
            <Field label="Lot label" htmlFor="tLot" className="">
              <input id="tLot" className={inputCls} value={tpl.lotLabel} onChange={(e) => update("lotLabel", e.target.value)} />
            </Field>
          </div>
        </Group>

        {SHOW_FONTS && getPreset(tpl.preset).design === "handmade" && (
          <Group step={3} title="Fonts">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                ["Made date", "dateFont", "tFDate"],
                ["Captions", "captionFont", "tFCap"],
                ["EXP + lot", "valueFont", "tFVal"],
              ] as const).map(([label, key, id]) => (
                <Field key={key} label={label} htmlFor={id} className="">
                  <select id={id} className={inputCls} value={tpl[key]} onChange={(e) => update(key, e.target.value as FontKey)}>
                    {(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
                  </select>
                </Field>
              ))}
            </div>
          </Group>
        )}

        <Group step={SHOW_FONTS ? 4 : 3} title="Dates" hint="How the made and expiry dates are written">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Date format">
            {DATE_FORMATS.map((f) => {
              const active = tpl.format === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update("format", f.value as DateFormat)}
                  className={`h-11 rounded-xl border px-2 font-mono text-sm tabular-nums outline-none transition focus-visible:ring-4 focus-visible:ring-accent/20 ${
                    active
                      ? "border-accent bg-accent/5 font-semibold ring-2 ring-accent/20"
                      : "border-line bg-white text-muted hover:border-neutral-300 hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-page px-3 py-1.5 text-xs text-muted">
            <span className="size-1.5 rounded-full bg-accent" />
            Expiry is fixed: made date + {SHELF_LIFE.months} months {SHELF_LIFE.days} days
          </p>
        </Group>
      </div>

      {/* <div className="grid grid-cols-3 gap-2.5">
        <Field label="Lot prefix" htmlFor="tPrefix">
          <input id="tPrefix" className={`${inputCls} uppercase`} value={tpl.lotPrefix} onChange={(e) => update("lotPrefix", e.target.value)} />
        </Field>
        <Field label="Value font" htmlFor="tFont">
          <select id="tFont" className={inputCls} value={tpl.font} onChange={(e) => update("font", e.target.value as FontKey)}>
            {(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
          </select>
        </Field>
        <Field label="Caption font" htmlFor="tLabelFont">
          <select id="tLabelFont" className={inputCls} value={tpl.labelFont} onChange={(e) => update("labelFont", e.target.value as FontKey)}>
            {(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
          </select>
        </Field>
      </div> */}

      {/* <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Check checked={tpl.lotWithYear} onChange={(v) => update("lotWithYear", v)}>Year in lot</Check>
        <Check checked={tpl.showIcon} onChange={(v) => update("showIcon", v)}>Hourglass icon</Check>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Label paper" htmlFor="tPaper">
          <select id="tPaper" className={inputCls} value={tpl.paper} onChange={(e) => update("paper", e.target.value as LabelPaper)}>
            <option value="gaps">White sticker</option>
            <option value="transparent">Transparent</option>
          </select>
        </Field>
        <Field label={<>Print darkness: {tpl.density}</>} htmlFor="tDensity">
          <input id="tDensity" type="range" min={1} max={5} step={1} className="h-10 w-full accent-accent"
            value={tpl.density} onChange={(e) => update("density", Number(e.target.value))} />
        </Field>
      </div> */}

      {/* <div className="grid grid-cols-2 gap-2.5">
        <Field label={<>Nudge left/right: {tpl.offsetX}px</>} htmlFor="tOffX">
          <input id="tOffX" type="range" min={-40} max={40} className="h-10 w-full accent-accent"
            value={tpl.offsetX} onChange={(e) => update("offsetX", Number(e.target.value))} />
        </Field>
        <Field label={<>Nudge up/down: {tpl.offsetY}px</>} htmlFor="tOffY">
          <input id="tOffY" type="range" min={-30} max={30} className="h-10 w-full accent-accent"
            value={tpl.offsetY} onChange={(e) => update("offsetY", Number(e.target.value))} />
        </Field>
      </div> */}

      {/* <div className="grid grid-cols-2 gap-2.5">
        <Field label={<>Table size: {tpl.scale}%</>} htmlFor="tScale">
          <input id="tScale" type="range" min={60} max={130} step={5} className="h-10 w-full accent-accent"
            value={tpl.scale} onChange={(e) => update("scale", Number(e.target.value))} />
        </Field>
        <Field label="Line thickness" htmlFor="tLine">
          <select id="tLine" className={inputCls} value={tpl.lineWidth} onChange={(e) => update("lineWidth", Number(e.target.value))}>
            <option value={1}>Thin (1 dot, like design)</option>
            <option value={2}>Normal (2 dots)</option>
            <option value={3}>Bold (3 dots)</option>
          </select>
        </Field>
      </div> */}

      <p className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-xs text-muted">
        <span className="size-1.5 rounded-full bg-ok" />
        Saved automatically in this browser
      </p>
    </section>
  );
}
