// import type { NextRequest } from "next/server";
// import { getStats } from "@/lib/db";
// import { HttpError, day, handle, int } from "@/lib/http";

// /** Finished label totals: ?from=YYYY-MM-DD&to=YYYY-MM-DD&group=day|month[&product=ID] */
// export async function GET(request: NextRequest) {
//   const q = request.nextUrl.searchParams;
//   return handle("GET /api/stats", async () => {
//     const from = day(q.get("from"), "from date");
//     const to = day(q.get("to"), "to date");
//     if (from > to) throw new HttpError(400, "Pick a valid date range");
//     const product = q.get("product");
//     const rows = await getStats(from, to, q.get("group") === "month" ? "month" : "day",
//       product ? int(product, "Product", 1, 2 ** 31 - 1) : null);
//     return { rows };
//   });
// }


// app/api/stats/route.ts
import { getStats } from "@/lib/db";
import { day, handle, HttpError } from "@/lib/http";


/** GET /api/stats?from=&to=&group=day|month → finished prints per day or month, with labels per label type. */
export function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  return handle("GET /api/stats", async () => {
    const group = p.get("group");
    if (group !== "day" && group !== "month") throw new HttpError(400, "Bad group");
    return { rows: await getStats(day(p.get("from"), "from date"), day(p.get("to"), "to date"), group) };
  });
}
