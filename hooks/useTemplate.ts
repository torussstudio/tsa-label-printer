"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorText, fetchSetting, saveSetting } from "@/lib/api";
import type { SettingKey } from "@/lib/db";
import { DEFAULT_TEMPLATE, type LabelTemplate, type PresetId } from "@/lib/label";

/** Changes are saved this long after the last edit, so dragging a value doesn't send a request per step. */
const SAVE_DELAY = 600;

/** Settings this browser kept before they moved to the database (read once, then removed). */
function takeLegacy<T>(legacyKey: string): T | null {
  try {
    const raw = localStorage.getItem(legacyKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function dropLegacy(legacyKey: string) {
  try { localStorage.removeItem(legacyKey); } catch { /* storage unavailable */ }
}

/**
 * A setting stored in the database and shared by every device, merged over `defaults`.
 * The first time, what this browser saved before (in `legacyKey`) is copied up, so nothing is lost.
 */
export function useDbSetting<T extends object>(key: SettingKey, defaults: T, legacyKey: string) {
  const [value, setValue] = useState<T>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<T | null>(null); // edited and not saved yet

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let saved: T | null = await fetchSetting<T>(key);
        const legacy = takeLegacy<T>(legacyKey);
        if (saved === null && legacy) {
          await saveSetting(key, legacy);
          saved = legacy;
        }
        if (legacy) dropLegacy(legacyKey); // the database is the only copy from now on
        if (cancelled) return;
        pending.current = null; // edits made before loading would overwrite the saved settings
        if (saved) setValue({ ...defaults, ...saved });
        setLoaded(true);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(`Settings couldn't load: ${errorText(e)}`);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults are constant per key
  }, [key, legacyKey]);

  const flush = useCallback((keepalive = false) => {
    const v = pending.current;
    if (!v) return;
    pending.current = null;
    saveSetting(key, v, keepalive).then(
      () => setError(null),
      (e) => {
        if (!pending.current) pending.current = v; // retried with the next edit
        setError(`Settings not saved: ${errorText(e)}`);
      },
    );
  }, [key]);

  // Save shortly after the last edit
  useEffect(() => {
    if (!loaded || !pending.current) return;
    const t = setTimeout(() => flush(), SAVE_DELAY);
    return () => clearTimeout(t);
  }, [value, loaded, flush]);

  // Closing the tab right after an edit still saves it
  useEffect(() => {
    const onHide = () => flush(true);
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flush]);

  const update = useCallback(<K extends keyof T>(k: K, v: T[K]) => {
    setValue((s) => {
      const next = { ...s, [k]: v };
      pending.current = next;
      return next;
    });
  }, []);

  return { value, update, loaded, error };
}

export function useTemplate() {
  const { value, update, loaded, error } = useDbSetting<LabelTemplate>("template", DEFAULT_TEMPLATE, "tsa-lot-label-template-v7");
  return { tpl: value, update, loaded, error };
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

/** Print page choices, shared by every device: the selected product and the quick jobs. */
export function usePrintSettings() {
  const { value, update, error } = useDbSetting<{ productId: number | null; quickJobs: QuickJob[] }>(
    "print", { productId: null, quickJobs: [] }, "tsa-print-settings-v1",
  );
  return { settings: value, update, error };
}
