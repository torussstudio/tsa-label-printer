"use client";

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

export type ToastType = "success" | "error";
export interface ToastNotice {
  id: number;
  type: ToastType;
  text: string;
}

let nextToastId = 0;

export function showToast(type: ToastType, text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lot-label:toast", { detail: { id: ++nextToastId, type, text } satisfies ToastNotice }));
}

export function ToastHost() {
  const [notices, setNotices] = useState<ToastNotice[]>([]);
  const timers = useRef(new Map<number, number>());

  useEffect(() => {
    const activeTimers = timers.current;
    const dismiss = (id: number) => {
      const timer = activeTimers.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      activeTimers.delete(id);
      setNotices((all) => all.filter((notice) => notice.id !== id));
    };
    const onToast = (event: Event) => {
      const notice = (event as CustomEvent<ToastNotice>).detail;
      setNotices((all) => [...all, notice].slice(-3));
      activeTimers.set(notice.id, window.setTimeout(() => dismiss(notice.id), 4500));
    };
    window.addEventListener("lot-label:toast", onToast);
    return () => {
      window.removeEventListener("lot-label:toast", onToast);
      for (const timer of activeTimers.values()) window.clearTimeout(timer);
      activeTimers.clear();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {notices.map((notice) => {
        const success = notice.type === "success";
        return <div key={notice.id} role={success ? "status" : "alert"} aria-live={success ? "polite" : "assertive"}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${success ? "border-ok/30" : "border-err/30"}`}>
          <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${success ? "bg-ok" : "bg-err"}`}>
            {success ? "✓" : "!"}
          </span>
          <p className={`min-w-0 flex-1 pt-0.5 text-sm ${success ? "text-ink" : "text-err"}`}>{notice.text}</p>
          <button type="button" aria-label="Dismiss notification" onClick={() => dismissNotice(notice.id, timers, setNotices)}
            className="-mr-1 -mt-1 rounded-md px-2 py-1 text-muted hover:bg-page">×</button>
        </div>;
      })}
    </div>
  );
}

function dismissNotice(id: number, timers: MutableRefObject<Map<number, number>>, setNotices: Dispatch<SetStateAction<ToastNotice[]>>) {
  const timer = timers.current.get(id);
  if (timer !== undefined) window.clearTimeout(timer);
  timers.current.delete(id);
  setNotices((all) => all.filter((notice) => notice.id !== id));
}
