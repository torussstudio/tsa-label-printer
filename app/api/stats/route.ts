import type { NextRequest } from "next/server";
import { getStats } from "@/lib/db";
import { HttpError, day, handle, int } from "@/lib/http";

/** Finished label totals: ?from=YYYY-MM-DD&to=YYYY-MM-DD&group=day|month[&product=ID] */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  return handle("GET /api/stats", async () => {
    const from = day(q.get("from"), "from date");
    const to = day(q.get("to"), "to date");
    if (from > to) throw new HttpError(400, "Pick a valid date range");
    const product = q.get("product");
    const rows = await getStats(from, to, q.get("group") === "month" ? "month" : "day",
      product ? int(product, "Product", 1, 2 ** 31 - 1) : null);
    return { rows };
  });
}
