"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_TEMPLATE, type LabelTemplate, type PresetId } from "@/lib/label";

/** State persisted in localStorage (per browser), merged over `defaults`. */
export function usePersisted<T extends object>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once on mount
      if (raw) setValue({ ...defaults, ...JSON.parse(raw) });
    } catch { /* storage unavailable */ }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value, loaded]);

  const update = useCallback(<K extends keyof T>(k: K, v: T[K]) => {
    setValue((s) => ({ ...s, [k]: v }));
  }, []);

  return { value, update, loaded };
}

export function useTemplate() {
  const { value, update, loaded } = usePersisted<LabelTemplate>("tsa-lot-label-template-v7", DEFAULT_TEMPLATE);
  return { tpl: value, update, loaded };
}

/**
 * Current time, refreshed every `ms` and when the tab becomes visible again.
 * Starts as null so nothing time-based is prerendered on the server.
 */
export function useNow(ms = 15000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, ms);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [ms]);
  return now;
}
/** A saved product + label type + quantity combination, set up with one tap. */
export interface QuickJob {
  id: string;
  productId: number;
  preset: PresetId;
  qty: number;
}

/** Print page choices kept per device: the selected product and the quick jobs. */
export function usePrintSettings() {
  const { value, update } = usePersisted<{ productId: number | null; quickJobs: QuickJob[] }>(
    "tsa-print-settings-v1", { productId: null, quickJobs: [] },
  );
  return { settings: value, update };
}
