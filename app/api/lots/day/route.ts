// import type { NextRequest } from "next/server";
// import { findLot, serverToday } from "@/lib/db";
// import { day, handle, int } from "@/lib/http";

// /**
//  * ?product=ID[&date=YYYY-MM-DD] → { today, lot }. `lot` is null until that day's first print makes it;
//  * looking never makes one. `today` is the server's day (Spain time).
//  */
// export async function GET(request: NextRequest) {
//   const q = request.nextUrl.searchParams;
//   return handle("GET /api/lots/day", async () => {
//     const productId = int(q.get("product"), "Product", 1, 2 ** 31 - 1);
//     const today = await serverToday();
//     const date = q.get("date") ? day(q.get("date")) : today;
//     return { today, lot: await findLot(productId, date) };
//   });
// }


// app/api/lots/day/route.ts
import { findLot, serverToday } from "@/lib/db";
import { day, handle, HttpError } from "@/lib/http";


/** GET /api/lots/day?kind=day&date=YYYY-MM-DD → the shared daily lot. */
export function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  return handle("GET /api/lots/day", async () => {
    const kind = p.get("kind");
    if (kind !== "day") throw new HttpError(400, "Bad lot kind");
    const today = await serverToday();
    const date = p.get("date") ? day(p.get("date")) : today;
    return { today, lot: await findLot(date, kind) };
  });
}
