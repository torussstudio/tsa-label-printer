import type { NextRequest } from "next/server";
import { findLot, serverToday } from "@/lib/db";
import { day, handle, int } from "@/lib/http";

/**
 * ?product=ID[&date=YYYY-MM-DD] → { today, lot }. `lot` is null until that day's first print makes it;
 * looking never makes one. `today` is the server's day (Spain time).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  return handle("GET /api/lots/day", async () => {
    const productId = int(q.get("product"), "Product", 1, 2 ** 31 - 1);
    const today = await serverToday();
    const date = q.get("date") ? day(q.get("date")) : today;
    return { today, lot: await findLot(productId, date) };
  });
}
