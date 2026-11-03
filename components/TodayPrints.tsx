"use client";

import Link from "next/link";
import { useState } from "react";
import { errorText, setWasted, type PrintJob } from "@/lib/api";
import { getPreset } from "@/lib/label";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const STATUS: Record<PrintJob["status"], { label: string; cls: string }> = {
  printed: { label: "Printed", cls: "bg-ok/10 text-ok" },
  failed: { label: "Failed", cls: "bg-err/10 text-err" },
  pending: { label: "Not finished", cls: "bg-warn/10 text-warn" },
};

/** Today's print jobs on every device, with a way to record misprinted labels. */
export function TodayPrints({ jobs, error, onChanged }: { jobs: PrintJob[] | null; error: string | null; onChanged: () => void }) {
  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const done = jobs?.filter((j) => j.status === "printed") ?? [];
  const printed = done.reduce((s, j) => s + j.quantity, 0);
  const wasted = done.reduce((s, j) => s + j.wasted, 0);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await setWasted(editing.id, Number(editing.value) || 0);
      setEditing(null);
      setSaveErr(null);
      onChanged();
    } catch (e) {
      setSaveErr(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Printed today</h2>
        <p className="text-xs text-muted tabular-nums">
          <span className="font-semibold text-ink">{printed - wasted}</span> good · {wasted} wasted · {done.length} job{done.length === 1 ? "" : "s"}
        </p>
      </div>

      {error && <p className="text-sm text-err">{error}</p>}
      {saveErr && <p className="mb-2 text-sm text-err">{saveErr}</p>}
      {jobs?.length === 0 && <p className="py-4 text-center text-sm text-muted">Nothing printed yet today.</p>}

      <ul className="divide-y divide-line">
        {jobs?.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 text-sm">
            <span className="w-11 shrink-0 text-xs text-muted tabular-nums">{time(j.printedAt)}</span>
            <div className="min-w-0 flex-1 basis-44">
              <p className="truncate font-semibold">
                {j.productName ?? "No product"} <span className="font-normal text-muted">· {getPreset(j.preset).name}</span>
              </p>
              <p className="truncate text-xs text-muted">
                <Link href={`/lots/${j.lotId}`} className="font-mono hover:text-accent hover:underline">{j.lot}</Link>
                {j.note && <> · {j.note}</>}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[j.status].cls}`}>{STATUS[j.status].label}</span>
            <span className="w-12 text-right font-semibold tabular-nums">×{j.quantity}</span>
            {j.status === "printed" && (editing?.id === j.id ? (
              <span className="flex items-center gap-1">
                <input type="number" min={0} max={j.quantity} value={editing.value} autoFocus aria-label="Wasted labels"
                  onChange={(e) => setEditing({ id: j.id, value: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(null); }}
                  className="h-8 w-14 rounded-md border border-line px-1.5 text-center tabular-nums outline-none focus:border-accent" />
                <button type="button" onClick={save} disabled={saving}
                  className="h-8 rounded-md bg-ink px-2.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setEditing(null)} className="h-8 px-1.5 text-xs text-muted hover:text-ink">Cancel</button>
              </span>
            ) : (
              <button type="button" onClick={() => setEditing({ id: j.id, value: String(j.wasted || "") })}
                className={`h-8 rounded-md border px-2.5 text-xs font-semibold transition ${
                  j.wasted ? "border-err/30 bg-err/5 text-err" : "border-line text-muted hover:text-ink"
                }`}>
                {j.wasted ? `${j.wasted} wasted` : "Mark wasted"}
              </button>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
