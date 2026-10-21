// "use client";

// import { DATE_FORMATS, FONTS, type DateFormat, type FontKey, type LabelPaper, type LabelTemplate } from "@/lib/label";

// interface Props {
//   tpl: LabelTemplate;
//   update: <K extends keyof LabelTemplate>(key: K, value: LabelTemplate[K]) => void;
// }

// export const inputCls =
//   "h-10 w-full rounded-lg border border-line bg-white px-3 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

// export function Field({ label, htmlFor, children }: { label: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
//   return (
//     <div className="mt-3">
//       <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-muted">{label}</label>
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

// export function TemplateForm({ tpl, update }: Props) {
//   return (
//     <section className="rounded-2xl border border-line bg-white p-5">
//       <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Template</h2>

//       <div className="grid grid-cols-3 gap-2.5">
//         <Field label="Made label" htmlFor="tMade">
//           <input id="tMade" className={inputCls} value={tpl.madeLabel} onChange={(e) => update("madeLabel", e.target.value)} />
//         </Field>
//         <Field label="Expiry label" htmlFor="tExp">
//           <input id="tExp" className={inputCls} value={tpl.expLabel} onChange={(e) => update("expLabel", e.target.value)} />
//         </Field>
//         <Field label="Lot label" htmlFor="tLot">
//           <input id="tLot" className={inputCls} value={tpl.lotLabel} onChange={(e) => update("lotLabel", e.target.value)} />
//         </Field>
//       </div>

//       <div className="grid grid-cols-2 gap-2.5">
//         <Field label="Date format" htmlFor="tFormat">
//           <select id="tFormat" className={inputCls} value={tpl.format} onChange={(e) => update("format", e.target.value as DateFormat)}>
//             {DATE_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
//           </select>
//         </Field>
//         <Field label="Shelf life (months)" htmlFor="tShelf">
//           <input id="tShelf" type="number" min={0} max={120} className={inputCls} value={tpl.shelfLifeMonths}
//             onChange={(e) => update("shelfLifeMonths", Math.max(0, Math.min(120, Number(e.target.value) || 0)))} />
//         </Field>
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

//       <p className="mt-4 text-xs text-muted">
//         Saved automatically in this browser. 8px ≈ 1mm on the label.
//       </p>
//     </section>
//   );
// }



"use client";

/* eslint-disable @typescript-eslint/no-unused-vars -- FONTS, FontKey, LabelPaper and Check are used by the commented-out options below */
import { DATE_FORMATS, FONTS, type DateFormat, type FontKey, type LabelPaper, type LabelTemplate } from "@/lib/label";

interface Props {
  tpl: LabelTemplate;
  update: <K extends keyof LabelTemplate>(key: K, value: LabelTemplate[K]) => void;
}

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

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

/** Small heading that groups related fields. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{title}</h3>
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

export function TemplateForm({ tpl, update }: Props) {
  return (
    <section className="self-start rounded-2xl border border-line bg-white p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Template</h2>

      <div className="divide-y divide-line [&>*]:py-4 [&>*:first-child]:pt-0">
        <Group title="Label text">
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

        <Group title="Dates">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date format" htmlFor="tFormat" className="">
              <select id="tFormat" className={inputCls} value={tpl.format} onChange={(e) => update("format", e.target.value as DateFormat)}>
                {DATE_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Shelf life" htmlFor="tShelf" className="">
              <div className="relative">
                <input id="tShelf" type="number" min={0} max={120} className={`${inputCls} pr-20`} value={tpl.shelfLifeMonths}
                  onChange={(e) => update("shelfLifeMonths", Math.max(0, Math.min(120, Number(e.target.value) || 0)))} />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">months</span>
              </div>
            </Field>
          </div>
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

      <p className="border-t border-line pt-4 text-xs text-muted">
        Saved automatically in this browser.
      </p>
    </section>
  );
}