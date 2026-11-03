import type { NextRequest } from "next/server";
import { searchLots } from "@/lib/db";
import { HttpError, day, handle, text } from "@/lib/http";

/**
 * ?q=…&from=YYYY-MM-DD&to=YYYY-MM-DD (all optional) → lots made in that range whose code, printed lot
 * or a raw material batch contains q (latest 50), with totals over every matching lot.
 */
export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams;
  return handle("GET /api/lots", async () => {
    const from = s.get("from") ? day(s.get("from"), "from date") : null;
    const to = s.get("to") ? day(s.get("to"), "to date") : null;
    if (from && to && from > to) throw new HttpError(400, "\"From\" must be before \"To\"");
    return searchLots({ q: text(s.get("q"), 60), from, to });
  });
}
