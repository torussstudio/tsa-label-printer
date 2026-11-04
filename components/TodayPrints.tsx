// "use client";

// import Link from "next/link";
// import type { PrintJob } from "@/lib/api";
// import { getPreset } from "@/lib/label";

// const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// const STATUS: Record<PrintJob["status"], { label: string; cls: string }> = {
//   printed: { label: "Printed", cls: "bg-ok/10 text-ok" },
//   failed: { label: "Failed", cls: "bg-err/10 text-err" },
//   pending: { label: "Not finished", cls: "bg-warn/10 text-warn" },
// };

// /** Today's print jobs on every device. */
// export function TodayPrints({ jobs, error }: { jobs: PrintJob[] | null; error: string | null }) {
//   const done = jobs?.filter((j) => j.status === "printed") ?? [];
//   const printed = done.reduce((s, j) => s + j.quantity, 0);

//   return (
//     <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
//       <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
//         <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Printed today</h2>
//         <p className="text-xs text-muted tabular-nums">
//           <span className="font-semibold text-ink">{printed}</span> label{printed === 1 ? "" : "s"} · {done.length} job{done.length === 1 ? "" : "s"}
//         </p>
//       </div>

//       {error && <p className="text-sm text-err">{error}</p>}
//       {jobs?.length === 0 && <p className="py-4 text-center text-sm text-muted">Nothing printed yet today.</p>}

//       <ul className="divide-y divide-line">
//         {jobs?.map((j) => (
//           <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 text-sm">
//             <span className="w-11 shrink-0 text-xs text-muted tabular-nums">{time(j.printedAt)}</span>
//             <div className="min-w-0 flex-1 basis-44">
//               <p className="truncate font-semibold">
//                 {j.productName ?? "No product"} <span className="font-normal text-muted">· {getPreset(j.preset).name}</span>
//               </p>
//               <p className="truncate text-xs text-muted">
//                 <Link href={`/lots/${j.lotId}`} className="font-mono hover:text-accent hover:underline">{j.lot}</Link>
//                 {j.note && <> · {j.note}</>}
//               </p>
//             </div>
//             <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[j.status].cls}`}>{STATUS[j.status].label}</span>
//             <span className="w-12 text-right font-semibold tabular-nums">×{j.quantity}</span>
//           </li>
//         ))}
//       </ul>
//     </section>
//   );
// }



"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { PrintJob } from "@/lib/api";
import { getPreset } from "@/lib/label";
import { showToast } from "@/components/Toast";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const STATUS: Record<PrintJob["status"], { label: string; cls: string }> = {
  printed: { label: "Printed", cls: "bg-ok/10 text-ok" },
  failed: { label: "Failed", cls: "bg-err/10 text-err" },
  pending: { label: "Not finished", cls: "bg-warn/10 text-warn" },
};

/** Today's print jobs on every device. */
export function TodayPrints({ jobs, error }: { jobs: PrintJob[] | null; error: string | null }) {
  useEffect(() => { if (error) showToast("error", error); }, [error]);
  const done = jobs?.filter((j) => j.status === "printed") ?? [];
  const printed = done.reduce((s, j) => s + j.quantity, 0);

  return (
    <section className="border-y border-line bg-white p-4 sm:rounded-2xl sm:border sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Printed today</h2>
        <p className="text-xs text-muted tabular-nums">
          <span className="font-semibold text-ink">{printed}</span> label{printed === 1 ? "" : "s"} · {done.length} job{done.length === 1 ? "" : "s"}
        </p>
      </div>

      {jobs?.length === 0 && <p className="py-4 text-center text-sm text-muted">Nothing printed yet today.</p>}

      <ul className="divide-y divide-line">
        {jobs?.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 text-sm">
            <span className="w-11 shrink-0 text-xs text-muted tabular-nums">{time(j.printedAt)}</span>
            <div className="min-w-0 flex-1 basis-44">
              <p className="truncate font-semibold">
                {getPreset(j.preset).name}
              </p>
              <p className="truncate text-xs text-muted">
                <Link href={`/lots/${j.lotId}`} className="font-mono hover:text-accent hover:underline">{j.lot}</Link>
                {j.note && <> · {j.note}</>}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[j.status].cls}`}>{STATUS[j.status].label}</span>
            <span className="w-12 text-right font-semibold tabular-nums">×{j.quantity}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
